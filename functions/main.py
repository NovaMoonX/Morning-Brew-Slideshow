import json
from datetime import datetime, timedelta
from firebase_functions import https_fn, firestore_fn, scheduler_fn, options

from firebase_admin import storage
from bs4 import BeautifulSoup

import http_client
from firebase_db import get_db
from ingest_handler import handle_ingest_issue, ARCHIVE_BASE_URL, LATEST_ISSUE_URL

from parser import MorningBrewParser
from slide_builder import SlideBuilder
from enrichment import LinkEnricher
from gemini import get_gemini_util
from audio import AudioEngine


def _fetch_issue_slugs_from_archive(limit: int) -> list:
    """Fetches the Morning Brew archive page and returns up to `limit` issue slugs
    by parsing anchor hrefs that start with '/issues/'.
    """
    archive_url = f"{ARCHIVE_BASE_URL}/archive"
    response = http_client.get(archive_url, timeout=15)
    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to fetch Morning Brew archive (status {response.status_code})."
        )

    soup = BeautifulSoup(response.text, 'html.parser')
    slugs = []
    seen = set()
    for anchor in soup.find_all('a', href=True):
        href = anchor['href']
        if href.startswith('/issues/'):
            slug = href[len('/issues/'):].strip('/')
            if slug and slug not in seen:
                seen.add(slug)
                slugs.append(slug)
                if len(slugs) >= limit:
                    break
    return slugs
@https_fn.on_request(
    timeout_sec=120,
    memory=512,
    invoker="public",
    cors=options.CorsOptions(
        cors_origins="*",
        cors_methods=["GET", "POST", "OPTIONS"],
    ),
)
def ingest_issue(req: https_fn.Request) -> https_fn.Response:
    """HTTP endpoint to download the latest Morning Brew newsletter and compile slides."""
    body, status = handle_ingest_issue(req)
    return https_fn.Response(body, status=status)


# 2. FUNCTION: Enrich Issue
@firestore_fn.on_document_created(document="issues/{date}")
def enrich_issue(event: firestore_fn.Event[firestore_fn.DocumentSnapshot | None]) -> None:
    """Enriches newly created slide links with OpenGraph tags and Gemini section-splitting."""
    if event.data is None:
        return

    date_key = event.params["date"]
    raw_data = event.data.to_dict()
    if raw_data.get('status') != 'ready':
        return

    print(f"Triggered enrichment for issue: {date_key}")

    try:
        # Load slides list
        slides_list = raw_data.get('slides', [])
        
        # 1. Collect all slides links
        all_links = []
        for slide in slides_list:
            for link in slide.get('links', []):
                all_links.append(link)

        # 2. Concurrently scrape OpenGraph tags
        enricher = LinkEnricher()
        unique_urls = {}
        for link_dict in all_links:
            url = link_dict.get('url')
            if url and url not in unique_urls:
                unique_urls[url] = {
                    'url': url,
                    'anchor_text': link_dict.get('anchor_text', ''),
                    'section_id': link_dict.get('section_id', '')
                }

        unique_objs = [
            LinkRef(url=v['url'], anchor_text=v['anchor_text'], section_id=v['section_id'])
            for v in unique_urls.values()
        ]
        enriched_by_original = {obj.url: obj for obj in unique_objs}
        enricher.enrich_all_links(unique_objs)

        # Update link lists inside slides
        for slide in slides_list:
            for link in slide.get('links', []):
                enriched = enriched_by_original.get(link.get('url'))
                if enriched:
                    link['url'] = enriched.url
                    link['domain'] = enriched.domain
                    link['og_title'] = enriched.og_title
                    link['og_description'] = enriched.og_description
                    link['og_image'] = enriched.og_image

        # 3. Gemini Integrations: Section Splitting and Link Summarizations
        gemini = get_gemini_util()
        
        # Split marked sections
        sections_dict = raw_data.get('sections', [])
        sections_changed = False
        
        for sec in sections_dict:
            if sec.get('needs_gemini_split'):
                # Split blocks using Gemini flash
                from models import ContentSection, ContentBlock
                blocks_objs = [
                    ContentBlock(type=b.get('type'), text=b.get('text'))
                    for b in sec.get('content_blocks', [])
                ]
                sec_obj = ContentSection(
                    id=sec.get('id'),
                    category=sec.get('category'),
                    title=sec.get('title'),
                    content_blocks=blocks_objs,
                    needs_gemini_split=True
                )
                split_blocks = gemini.split_section(sec_obj)
                sec['content_blocks'] = [b.to_dict() for b in split_blocks]
                sec['needs_gemini_split'] = False
                sections_changed = True

        # Recompile slides if Gemini split round-up cards
        if sections_changed:
            print("Gemini split roundup blocks. Recompiling slide orders.")
            from models import BrewIssue, ContentSection, ContentBlock, MarketTicker
            
            # Map back to classes to feed builder
            reconstructed_sections = []
            for sec in sections_dict:
                reconstructed_sections.append(ContentSection(
                    id=sec.get('id'),
                    category=sec.get('category'),
                    title=sec.get('title'),
                    content_blocks=[
                        ContentBlock(type=b.get('type'), text=b.get('text'), links=[
                            LinkRef(url=l.get('url'), anchor_text=l.get('anchor_text'), section_id=l.get('section_id'))
                            for l in b.get('links', [])
                        ]) for b in sec.get('content_blocks', [])
                    ],
                    image_url=sec.get('image_url'),
                    image_caption=sec.get('image_caption')
                ))

            brew_tickers = [
                MarketTicker(symbol=t.get('symbol'), value=t.get('value'), change=t.get('change'), direction=t.get('direction'))
                for t in raw_data.get('tickers', [])
            ]
            
            intro_blocks = [
                ContentBlock(
                    type=b.get('type', 'paragraph'),
                    text=b.get('text', ''),
                    body_html=b.get('body_html'),
                    links=[
                        LinkRef(url=l.get('url'), anchor_text=l.get('anchor_text'), section_id=l.get('section_id'))
                        for l in b.get('links', [])
                    ],
                )
                for b in raw_data.get('intro_blocks', [])
            ]

            reconstructed_issue = BrewIssue(
                id=raw_data.get('id'),
                date=raw_data.get('date'),
                title=raw_data.get('title'),
                subject_line=raw_data.get('subject_line'),
                primary_image_url=raw_data.get('primary_image_url'),
                intro=raw_data.get('intro'),
                intro_blocks=intro_blocks,
                tickers=brew_tickers,
                sections=reconstructed_sections
            )
            
            builder = SlideBuilder()
            compiled_slides = builder.build_slides(reconstructed_issue)
            
            # Re-map the enriched OpenGraph link tags to the newly compiled slides
            for slide in compiled_slides:
                for link in slide.links:
                    enriched = enriched_by_original.get(link.url)
                    if enriched:
                        link.url = enriched.url
                        link.domain = enriched.domain
                        link.og_title = enriched.og_title
                        link.og_description = enriched.og_description
                        link.og_image = enriched.og_image
            
            slides_list = [s.to_dict() for s in compiled_slides]

        # 4. Generate Gemini Link summaries where needed
        for slide in slides_list:
            for link in slide.get('links', []):
                if not link.get('og_description') or len(link.get('og_description', '')) < 80:
                    try:
                        res = http_client.get(link.get('url'), timeout=5)
                        summary = None
                        if res.status_code == 200:
                            summary = gemini.summarize_article(link.get('url'), res.text)
                        if not summary:
                            summary = gemini.summarize_link_metadata(
                                link.get('url'),
                                link.get('domain'),
                                link.get('anchor_text'),
                            )
                        if summary:
                            link['gemini_summary'] = summary
                            if not link.get('og_description'):
                                link['og_description'] = summary
                    except Exception as sum_err:
                        print(f"Summary scrape failed: {sum_err}")

        from link_enrichment import _apply_section_image_fallbacks
        section_images = {
            sec.get('id'): sec.get('image_url')
            for sec in sections_dict
            if sec.get('image_url')
        }
        _apply_section_image_fallbacks(slides_list, section_images)

        # Update Firestore
        get_db().collection('issues').document(date_key).update({
            'slides': slides_list,
            'sections': sections_dict,
            'status': 'enriched'
        })
        
        # Update Index status
        get_db().collection('issue_index').document(date_key).update({
            'status': 'enriched'
        })
        
        print(f"Completed enrichment for issue: {date_key}")
    except Exception as e:
        print(f"Failed to enrich issue {date_key}: {e}")
        get_db().collection('issues').document(date_key).update({'status': 'failed'})
        get_db().collection('issue_index').document(date_key).update({'status': 'failed'})


# 3. FUNCTION: Generate Audio
@firestore_fn.on_document_updated(document="issues/{date}")
def generate_audio(event: firestore_fn.Event[firestore_fn.Change[firestore_fn.DocumentSnapshot | None]]) -> None:
    """Triggered on Firestore document update. Runs when status transitions to 'enriched'."""
    if event.data is None or event.data.after is None:
        return

    date_key = event.params["date"]
    after_data = event.data.after.to_dict()
    
    if after_data.get('status') != 'enriched':
        return

    print(f"Triggered audio generation for issue: {date_key}")

    try:
        slides_list = after_data.get('slides', [])
        bucket = storage.bucket()
        audio_engine = AudioEngine()

        # Update status to block duplicate runs
        get_db().collection('issues').document(date_key).update({'status': 'audio'})

        for idx, slide in enumerate(slides_list):
            body_text = slide.get('body')
            # Generate speech only for slides with read aloud texts
            if body_text and slide.get('type') != 'link_cards':
                print(f"Synthesizing audio for slide {slide.get('id')}")
                
                # Preprocess text and synthesize MP3 bytes
                audio_bytes = audio_engine.generate_speech(body_text)
                
                if audio_bytes:
                    file_path = f"audio/{date_key}/{slide.get('id')}.mp3"
                    blob = bucket.blob(file_path)
                    
                    # Upload MP3
                    blob.upload_from_string(audio_bytes, content_type='audio/mpeg')
                    
                    # Generate public HTTP URL
                    blob.make_public()
                    slide['audio_url'] = blob.public_url
                    
                    # Update this slide in Firestore immediately (supports real-time client swaps)
                    get_db().collection('issues').document(date_key).update({
                        'slides': slides_list
                    })

        # Set final audio_ready states
        get_db().collection('issues').document(date_key).update({
            'status': 'audio_ready'
        })
        get_db().collection('issue_index').document(date_key).update({
            'status': 'audio_ready'
        })
        print(f"Completed audio generation for issue: {date_key}")
    except Exception as e:
        print(f"Failed to generate audio for issue {date_key}: {e}")
        get_db().collection('issues').document(date_key).update({'status': 'failed'})


# 4. FUNCTION: Cleanup Old Issues (Scheduled or manual HTTP)
@https_fn.on_request(timeout_sec=60)
def cleanup_old_issues(req: https_fn.Request) -> https_fn.Response:
    """Sunday weekly cleanup script deleting data older than 7 days from storage and databases."""
    try:
        seven_days_ago = datetime.utcnow() - timedelta(days=28)
        date_threshold = seven_days_ago.strftime('%Y-%m-%d')

        print(f"Cleaning issues older than {date_threshold}")
        bucket = storage.bucket()
        
        # Query summaries older than 7 days
        old_docs = get_db().collection('issue_index').where('id', '<', date_threshold).get()
        deleted_count = 0

        for doc in old_docs:
            date_key = doc.id
            
            # 1. Delete full issue document
            get_db().collection('issues').document(date_key).delete()
            
            # 2. Delete index document
            get_db().collection('issue_index').document(date_key).delete()
            
            # 3. Purge storage bucket audio files
            blobs = bucket.list_blobs(prefix=f"audio/{date_key}/")
            for blob in blobs:
                blob.delete()

            deleted_count += 1
            print(f"Purged all assets for issue date: {date_key}")

        return https_fn.Response(f"Cleanup finished. Purged {deleted_count} stale issues.", status=200)
    except Exception as e:
        print(f"Cleanup failure: {e}")
        return https_fn.Response(f"Cleanup failed: {str(e)}", status=500)


# 5. FUNCTION: Scheduled Daily Ingest (6am ET, retries every 20 min for 2 hours)
@scheduler_fn.on_schedule(
    schedule="0 6 * * *",
    timezone="America/New_York",
    retry_count=6,
    min_backoff_seconds=1200,
    max_backoff_seconds=1200,
    max_doublings=0,
)
def scheduled_ingest_issue(event: scheduler_fn.ScheduledEvent) -> None:
    """Runs daily at 6am ET. Ingests today's issue. Cloud Scheduler retries every 20 min
    (up to 6 times = 2 hours) if the function raises an exception."""

    url = LATEST_ISSUE_URL
    response = http_client.get(url, timeout=15)

    if response.status_code != 200:
        # Raise so Cloud Scheduler retries per the retry config above
        raise RuntimeError(
            f"Morning Brew returned HTTP {response.status_code} for latest issue URL. "
            "Cloud Scheduler will retry in 20 minutes."
        )

    parser = MorningBrewParser()
    issue = parser.parse_issue(response.text, None)
    actual_date = issue.id

    # Skip if already ingested
    if get_db().collection('issues').document(actual_date).get().exists:
        print(f"Scheduled ingest: issue {actual_date} already exists. Skipping.")
        return

    builder = SlideBuilder()
    issue.slides = builder.build_slides(issue)

    get_db().collection('issues').document(actual_date).set(issue.to_dict())
    get_db().collection('issue_index').document(actual_date).set({
        'id': actual_date,
        'date': issue.date,
        'title': issue.title,
        'primary_image_url': issue.primary_image_url,
        'status': 'ready',
        'fetched_at': datetime.utcnow().isoformat()
    })
    print(f"Scheduled ingest completed for {actual_date}. Total slides: {len(issue.slides)}")


# 6. FUNCTION: Backfill Issues (HTTP, user-triggered)
@https_fn.on_request(timeout_sec=540, memory=512)
def backfill_issues(req: https_fn.Request) -> https_fn.Response:
    """Bulk-ingest issues for the past N issues from the archive (default 7, max 28).
    Discovers issues by scraping https://www.morningbrew.com/archive anchor hrefs.
    Query params:
      days  - number of recent issues to fetch (default 7, max 28)
      force - set to 'true' to re-ingest issues that already exist
    """
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if req.method == 'OPTIONS':
        return https_fn.Response('', status=204, headers=cors_headers)

    try:
        count = min(int(req.args.get('days', '7')), 28)
    except (ValueError, TypeError):
        count = 7
    force_write = req.args.get('force') == 'true'

    results = []

    try:
        slugs = _fetch_issue_slugs_from_archive(count)
    except Exception as e:
        body = json.dumps({'error': str(e), 'ingested': 0, 'results': []})
        return https_fn.Response(body, status=502, headers={**cors_headers, 'Content-Type': 'application/json'})

    for slug in slugs:
        url = f"{ARCHIVE_BASE_URL}/issues/{slug}"

        try:
            response = http_client.get(url, timeout=15)
            if response.status_code != 200:
                results.append({'slug': slug, 'status': 'fetch_failed', 'http_code': response.status_code})
                continue

            parser = MorningBrewParser()
            issue = parser.parse_issue(response.text, None)
            actual_date = issue.id

            if not force_write:
                if get_db().collection('issues').document(actual_date).get().exists:
                    results.append({'slug': slug, 'date': actual_date, 'status': 'skipped'})
                    continue

            builder = SlideBuilder()
            issue.slides = builder.build_slides(issue)

            get_db().collection('issues').document(actual_date).set(issue.to_dict())
            get_db().collection('issue_index').document(actual_date).set({
                'id': actual_date,
                'date': issue.date,
                'title': issue.title,
                'primary_image_url': issue.primary_image_url,
                'status': 'ready',
                'fetched_at': datetime.utcnow().isoformat()
            })
            results.append({'slug': slug, 'date': actual_date, 'status': 'ingested'})
            print(f"Backfill ingested: {actual_date} (slug: '{slug}', {len(issue.slides)} slides)")

        except Exception as e:
            print(f"Backfill error for slug '{slug}': {e}")
            results.append({'slug': slug, 'status': 'error', 'error': str(e)})

    ingested = sum(1 for r in results if r['status'] == 'ingested')
    body = json.dumps({'ingested': ingested, 'results': results})
    return https_fn.Response(body, status=200, headers={**cors_headers, 'Content-Type': 'application/json'})