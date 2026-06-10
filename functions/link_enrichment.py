"""Shared link enrichment for ingest and Cloud Functions."""
from typing import Dict, List, Optional

from enrichment import LinkEnricher
from gemini import get_gemini_util
from models import LinkRef


def _needs_link_summary(link: dict) -> bool:
    description = (link.get('og_description') or '').strip()
    return len(description) < 80


def _apply_section_image_fallbacks(
    slides_list: List[dict],
    section_images: Optional[Dict[str, str]] = None,
) -> None:
    if not section_images:
        return

    for slide in slides_list:
        if slide.get('type') != 'link_cards':
            continue
        section_image = section_images.get(slide.get('section_id') or '')
        if not section_image:
            continue
        for link in slide.get('links', []):
            if not link.get('og_image'):
                link['og_image'] = section_image


def enrich_slide_links(
    slides_list: List[dict],
    section_images: Optional[Dict[str, str]] = None,
) -> None:
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

    gemini = get_gemini_util()
    for slide in slides_list:
        for link in slide.get('links', []):
            if not _needs_link_summary(link):
                continue
            summary = gemini.summarize_link_metadata(
                link.get('url'),
                link.get('domain'),
                link.get('anchor_text'),
            )
            if summary:
                link['gemini_summary'] = summary
                if not link.get('og_description'):
                    link['og_description'] = summary

    _apply_section_image_fallbacks(slides_list, section_images)
