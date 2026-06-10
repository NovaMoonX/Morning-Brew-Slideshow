"""Shared link enrichment for ingest and Cloud Functions."""
from typing import List

from enrichment import LinkEnricher
from models import LinkRef


def enrich_slide_links(slides_list: List[dict]) -> None:
    """Resolve tracking URLs and attach OpenGraph metadata to slide links in place."""
    unique_urls = {}
    for slide in slides_list:
        for link in slide.get('links', []):
            url = link.get('url')
            if url and url not in unique_urls:
                unique_urls[url] = {
                    'url': url,
                    'anchor_text': link.get('anchor_text', ''),
                    'section_id': link.get('section_id', ''),
                }

    if not unique_urls:
        return

    unique_objs = [
        LinkRef(url=v['url'], anchor_text=v['anchor_text'], section_id=v['section_id'])
        for v in unique_urls.values()
    ]
    enriched_by_original = {obj.url: obj for obj in unique_objs}
    LinkEnricher().enrich_all_links(unique_objs)

    for slide in slides_list:
        for link in slide.get('links', []):
            enriched = enriched_by_original.get(link.get('url'))
            if enriched:
                link['url'] = enriched.url
                link['domain'] = enriched.domain
                link['og_title'] = enriched.og_title
                link['og_description'] = enriched.og_description
                link['og_image'] = enriched.og_image
