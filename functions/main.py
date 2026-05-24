import os
from datetime import datetime, timedelta
from firebase_functions import https_fn, firestore_fn, scheduler_fn

from firebase_admin import initialize_app, firestore, storage
import requests
from bs4 import BeautifulSoup

# Initialize Firebase Admin SDK
initialize_app()
_db_client = None
def get_db():
    global _db_client
    if _db_client is None:
        _db_client = firestore.client()
    return _db_client

from parser import MorningBrewParser
from slide_builder import SlideBuilder
from enrichment import LinkEnricher
from gemini import GeminiUtil
from audio import AudioEngine

# 1. FUNCTION: Ingest Issue
@https_fn.on_request(timeout_sec=120, memory=512)
def ingest_issue(req: https_fn.Request) -> https_fn.Response:
    """HTTP endpoint to download the latest Morning Brew newsletter and compile slides."""
    date_param = req.args.get('date')  # YYYY-MM-DD
    force_write = req.args.get('force') == 'true'

    target_date = date_param
    url = "https://www.morningbrew.com/daily/issues/latest"
    if date_param:
        url = f"https://www.morningbrew.com/daily/issues/{date_param}"

    try:
        # Check current index to avoid duplicate work
        if date_param and not force_write:
            doc_ref = get_db().collection('issues').document(date_param)
            if doc_ref.get().exists:
                return https_fn.Response(f"Issue {date_param} already exists. Skipping.", status=200)

        # Download page HTML
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code != 200:
            return https_fn.Response(f"Failed to fetch Morning Brew newsletter from {url}. Status: {response.status_code}", status=500)

        # Ingest and Parse
        parser = MorningBrewParser()
        issue = parser.parse_issue(response.text, target_date)
        actual_date = issue.id  # YYYY-MM-DD

        if not force_write:
            doc_ref = get_db().collection('issues').document(actual_date)
            if doc_ref.get().exists:
                return https_fn.Response(f"Issue {actual_date} already exists in Firestore. Skipping.", status=200)

        # Compile Slide Deck
        builder = SlideBuilder()
        issue.slides = builder.build_slides(issue)

        # Save Issue document
        get_db().collection('issues').document(actual_date).set(issue.to_dict())

        # Save Summary Index for landing page selector grid
        get_db().collection('issue_index').document(actual_date).set({
            'id': actual_date,
            'date': issue.date,
            'title': issue.title,
            'primary_image_url': issue.primary_image_url,
            'status': 'ready',
            'fetched_at': datetime.utcnow().isoformat()
        })

        return https_fn.Response(f"Successfully ingested issue {actual_date}. Total slides: {len(issue.slides)}", status=200)
    except Exception as e:
        print(f"Critical Ingest failure: {e}")
        return https_fn.Response(f"Ingest failed: {str(e)}", status=500)


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
        enriched_objs = enricher.enrich_all_links(unique_objs)
        enriched_map = {obj.url: obj for obj in enriched_objs}

        # Update link lists inside slides
        for slide in slides_list:
            for link in slide.get('links', []):
                enriched = enriched_map.get(link.get('url'))
                if enriched:
                    link['url'] = enriched.url
                    link['og_title'] = enriched.og_title
                    link['og_description'] = enriched.og_description
                    link['og_image'] = enriched.og_image

        # 3. Gemini Integrations: Section Splitting and Link Summarizations
        gemini = GeminiUtil()
        
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
            
            reconstructed_issue = BrewIssue(
                id=raw_data.get('id'),
                date=raw_data.get('date'),
                title=raw_data.get('title'),
                subject_line=raw_data.get('subject_line'),
                primary_image_url=raw_data.get('primary_image_url'),
                intro=raw_data.get('intro'),
                tickers=brew_tickers,
                sections=reconstructed_sections
            )
            
            builder = SlideBuilder()
            compiled_slides = builder.build_slides(reconstructed_issue)
            
            # Re-map the enriched OpenGraph link tags to the newly compiled slides
            for slide in compiled_slides:
                for link in slide.links:
                    enriched = enriched_map.get(link.url)
                    if enriched:
                        link.og_title = enriched.og_title
                        link.og_description = enriched.og_description
                        link.og_image = enriched.og_image
            
            slides_list = [s.to_dict() for s in compiled_slides]

        # 4. Generate Gemini Link summaries where needed
        for slide in slides_list:
            for link in slide.get('links', []):
                # If og desc lacking, get a clean 2-sentence summary of the page using Gemini Flash
                if not link.get('og_description') or len(link.get('og_description', '')) < 80:
                    try:
                        res = requests.get(link.get('url'), headers={'User-Agent': 'Mozilla/5.0'}, timeout=5)
                        if res.status_code == 200:
                            summary = gemini.summarize_article(link.get('url'), res.text)
                            if summary:
                                link['gemini_summary'] = summary
                    except Exception as sum_err:
                        print(f"Summary scrape failed: {sum_err}")

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
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
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