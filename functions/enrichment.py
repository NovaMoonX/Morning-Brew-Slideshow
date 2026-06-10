import re
import http_client
from bs4 import BeautifulSoup
from typing import List, Optional
from urllib.parse import urlencode, urlparse
from concurrent.futures import ThreadPoolExecutor
from models import LinkRef

_PATH_NOISE = frozenset({
    'world', 'asia', 'europe', 'articles', 'article', 'news', 'politics',
    'business', 'opinion', 'story', 'stories', 'live', 'us', 'uk',
})

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

    @staticmethod
    def title_from_url(url: str) -> Optional[str]:
        """Derive a readable headline from the article URL path."""
        segments = [s for s in urlparse(url).path.split('/') if s]
        if not segments:
            return None

        meaningful = []
        for segment in segments:
            if re.fullmatch(r'\d{1,4}', segment):
                continue
            if segment.lower() in _PATH_NOISE:
                continue
            meaningful.append(segment)

        if not meaningful:
            meaningful = [segments[-1]]

        slug = meaningful[-1]
        slug = re.sub(r'\.(html?|php|aspx)$', '', slug, flags=re.I)
        slug = re.sub(r'-[a-f0-9]{8,}$', '', slug, flags=re.I)
        slug = slug.replace('-', ' ').strip()
        if len(slug) < 4:
            return None
        return slug.title()

    def _apply_metadata_fallbacks(self, link: LinkRef) -> None:
        if not link.og_title:
            link.og_title = self.title_from_url(link.url)

        if not link.og_description and link.domain and link.og_title:
            link.og_description = f"Read the full story on {link.domain}."

    def _fetch_oembed_metadata(self, url: str) -> dict:
        """Fetch publisher oEmbed data when direct OpenGraph scraping is blocked."""
        hostname = self._hostname(url) or ''
        result: dict = {}

        try:
            if 'nytimes.com' in hostname:
                oembed_url = (
                    'https://www.nytimes.com/svc/oembed/json/?'
                    + urlencode({'url': url})
                )
                res = http_client.get(
                    oembed_url,
                    headers=self.headers,
                    timeout=self.timeout,
                )
                if res.status_code == 200:
                    data = res.json()
                    result['title'] = data.get('title')
                    result['description'] = data.get('summary')
                    result['image'] = data.get('thumbnail_url')
                    return result

            noembed_url = (
                'https://noembed.com/embed?'
                + urlencode({'url': url})
            )
            res = http_client.get(
                noembed_url,
                headers=self.headers,
                timeout=self.timeout,
            )
            if res.status_code == 200:
                data = res.json()
                if not data.get('error'):
                    result['title'] = data.get('title')
                    result['description'] = data.get('description')
                    result['image'] = data.get('thumbnail_url')
        except Exception as e:
            print(f"oEmbed fetch failed for {url}: {e}")

        return result

    def _apply_oembed_fallbacks(self, link: LinkRef) -> None:
        needs_oembed = not link.og_image or not link.og_title or not link.og_description
        if not needs_oembed:
            return

        meta = self._fetch_oembed_metadata(link.url)
        if not link.og_title and meta.get('title'):
            link.og_title = meta['title']
        if not link.og_description and meta.get('description'):
            link.og_description = meta['description']
        if not link.og_image and meta.get('image'):
            link.og_image = meta['image']

    def enrich_link(self, link: LinkRef) -> LinkRef:
        """Enriches a single LinkRef with OpenGraph tags."""
        resolved_url = self.resolve_redirect(link.url)
        link.url = resolved_url
        link.domain = self._hostname(resolved_url)

        try:
            res = http_client.get(resolved_url, headers=self.headers, timeout=self.timeout)
            if res.status_code != 200:
                self._apply_oembed_fallbacks(link)
                self._apply_metadata_fallbacks(link)
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

        self._apply_oembed_fallbacks(link)
        self._apply_metadata_fallbacks(link)
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
