import http_client
from bs4 import BeautifulSoup
from typing import List, Optional
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor
from models import LinkRef

class LinkEnricher:
    def __init__(self, timeout: int = 5, max_workers: int = 5):
        self.timeout = timeout
        self.max_workers = max_workers
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

    def resolve_redirect(self, url: str) -> str:
        """Resolves tracking redirects by following redirects to final destination."""
        if 'links.morningbrew.com' not in url and 'morningbrew.com/c/' not in url:
            return url
        try:
            res = http_client.get(
                url,
                headers=self.headers,
                timeout=self.timeout,
                stream=True,
            )
            res.close()
            return res.url
        except Exception as e:
            print(f"Error resolving redirect for {url}: {e}")
            return url

    @staticmethod
    def _hostname(url: str) -> Optional[str]:
        hostname = urlparse(url).hostname
        if not hostname:
            return None
        return hostname.removeprefix('www.')

    def enrich_link(self, link: LinkRef) -> LinkRef:
        """Enriches a single LinkRef with OpenGraph tags."""
        resolved_url = self.resolve_redirect(link.url)
        link.url = resolved_url
        link.domain = self._hostname(resolved_url)

        try:
            res = http_client.get(resolved_url, headers=self.headers, timeout=self.timeout)
            if res.status_code != 200:
                return link

            soup = BeautifulSoup(res.text, 'html.parser')

            # Extract og:title or title
            og_title = soup.find('meta', property='og:title')
            link.og_title = og_title.get('content') if og_title else None
            if not link.og_title:
                title_tag = soup.find('title')
                link.og_title = title_tag.get_text(strip=True) if title_tag else None

            # Extract og:description or standard description
            og_desc = soup.find('meta', property='og:description')
            link.og_description = og_desc.get('content') if og_desc else None
            if not link.og_description:
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                link.og_description = meta_desc.get('content') if meta_desc else None

            # Extract og:image
            og_image = soup.find('meta', property='og:image')
            link.og_image = og_image.get('content') if og_image else None

            og_url = soup.find('meta', property='og:url')
            if og_url and og_url.get('content'):
                og_domain = self._hostname(og_url.get('content'))
                if og_domain and 'morningbrew.com' not in og_domain:
                    link.domain = og_domain

            # If description is too short or missing, flag it for Gemini enrichment
            # (Checks if length < 80 characters or starts with paywall indicators)
            desc_text = link.og_description or ""
            is_unusable = (
                len(desc_text) < 80 or
                any(indicator in desc_text.lower() for indicator in ['sign in', 'subscribe', '404', 'paywall'])
            )
            # We attach this flag in temporary variables or metadata logic in stage 2
            # Since the data model is simple, the enricher marks needs_gemini_summary: true
            # and stage 2 will call gemini if og_description is lacking.
        except Exception as e:
            print(f"Failed to scrape og tags for {resolved_url}: {e}")
            
        return link

    def enrich_all_links(self, links: List[LinkRef]) -> List[LinkRef]:
        """Scrapes all links concurrently using a ThreadPoolExecutor."""
        if not links:
            return []

        # Deduplicate by URL first to avoid duplicate requests
        unique_links = {}
        for link in links:
            if link.url not in unique_links:
                unique_links[link.url] = link

        links_to_enrich = list(unique_links.values())
        enriched_lookup = {}

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            results = executor.map(self.enrich_link, links_to_enrich)
            for original_url, enriched in zip(unique_links.keys(), results):
                enriched_lookup[original_url] = enriched

        return [enriched_lookup.get(link.url, link) for link in links]
