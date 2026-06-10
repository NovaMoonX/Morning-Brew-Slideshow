import json
import re
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Optional, List, Dict, Tuple, Any
import requests
from models import BrewIssue, ContentSection, ContentBlock, LinkRef, MarketTicker

class MorningBrewParser:
    SKIP_CATEGORIES = {
        'PLAY', 'SHARE THE BREW', 'QUIZ', 'READER POLL', 'ANSWER', 'RECS',
        'GAMES', 'SHARE', 'SPONSORED', 'AD', 'PROMOTION'
    }

    def __init__(self, skip_sponsored: bool = True):
        self.skip_sponsored = skip_sponsored

    def parse_issue(self, html_content: str, date_str: Optional[str] = None) -> BrewIssue:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # 1. Primary Strategy: Parse NEXT_DATA hydration JSON block
        next_data_script = soup.find('script', id='__NEXT_DATA__')
        issue_data = {}
        
        if next_data_script:
            try:
                data = json.loads(next_data_script.string)
                issue_data = data.get('props', {}).get('pageProps', {}).get('issueData', {})
            except Exception as e:
                print(f"Error parsing __NEXT_DATA__ JSON: {e}")

        # Extract core fields
        html_body = issue_data.get('html')
        date_raw = issue_data.get('date') or date_str or datetime.utcnow().strftime('%Y-%m-%d')
        issue_id = self._normalize_issue_id(date_raw)
        subject_line = issue_data.get('subjectLine') or "Morning Brew Newsletter"
        title = issue_data.get('title') or "Morning Brew"
        
        # Primary cover image URL from next data or meta fallback
        primary_image = None
        if issue_data.get('primaryImage'):
            primary_image = issue_data.get('primaryImage', {}).get('asset', {}).get('url')
        if not primary_image:
            meta_og_image = soup.find('meta', property='og:image')
            if meta_og_image:
                primary_image = meta_og_image.get('content')

        # Fallback to general page text parsing if NEXT_DATA is empty
        if not html_body:
            html_body = html_content

        # Clean parser BeautifulSoup object
        body_soup = BeautifulSoup(html_body, 'html.parser')
        
        # 2. Parse Intro Blurb
        intro_text = ""
        # The intro is usually paragraphs before the first story container or ticker table
        intro_paras = []
        first_container = body_soup.find(class_='story-container')
        
        # Scan initial paragraphs
        for tag in body_soup.find_all('p'):
            if first_container and tag.sourceline and first_container.sourceline and tag.sourceline >= first_container.sourceline:
                break
            text = tag.get_text(strip=True)
            if text and not any(k in text.upper() for k in ['INGEST', 'MORNING BREW', 'SUBSCRIBE']):
                intro_paras.append(text)
        intro_text = "\n\n".join(intro_paras[:3])
        if not intro_text:
            intro_text = "Welcome to today's edition of the Morning Brew. Let's walk through the latest global highlights."

        # 3. Parse Financial Tickers
        tickers = self._parse_tickers(body_soup)

        # 4. Parse Sections
        sections = []
        # Find all story container elements
        story_divs = body_soup.find_all(class_='story-container')
        
        # Fallback if class not c6/story-container
        if not story_divs:
            story_divs = body_soup.find_all('div', class_=re.compile(r'(c6|story)'))

        for index, div in enumerate(story_divs):
            section = self._parse_section(div, f"sec_{index:03d}")
            if section:
                # Filter unwanted sections
                if section.category.upper() in self.SKIP_CATEGORIES:
                    continue
                if self.skip_sponsored and section.is_sponsored:
                    continue
                sections.append(section)

        # 5. Word of Day
        word_of_day = self._extract_word_of_day(body_soup)

        return BrewIssue(
            id=issue_id,
            date=self._format_human_date(issue_id),
            title=title,
            subject_line=subject_line,
            primary_image_url=primary_image,
            intro=intro_text,
            tickers=tickers,
            sections=sections,
            word_of_day=word_of_day,
            fetched_at=datetime.utcnow(),
            status='ready'
        )

    def _parse_section(self, div_soup, section_id: str) -> Optional[ContentSection]:
        # Category label
        tag_p = div_soup.find(class_=re.compile(r'(tag-container|category|tag)'))
        category = "NEWS"
        if tag_p:
            category = tag_p.get_text(strip=True)
        else:
            h3 = div_soup.find('p', class_='h3') or div_soup.find('h3')
            if h3:
                category = h3.get_text(strip=True)

        # Title
        title_p = div_soup.find(class_=re.compile(r'(title-container|title)'))
        title = "Story Highlight"
        if title_p:
            title = title_p.get_text(strip=True)
        else:
            h1 = div_soup.find('p', class_='h1') or div_soup.find('h1')
            if h1:
                title = h1.get_text(strip=True)

        # Skip ads early
        if 'AD' in category.upper() or 'SPONSORED' in category.upper():
            return None

        # Image details
        img_url = None
        img_caption = None
        img_tag = div_soup.find('img')
        if img_tag and img_tag.get('src'):
            img_url = img_tag.get('src')
        
        caption_tag = div_soup.find(class_=re.compile(r'(source|caption)'))
        if caption_tag:
            img_caption = caption_tag.get_text(strip=True)

        # Content blocks
        blocks = []
        content_container = div_soup.find(class_=re.compile(r'(content-container|body|story-content)'))
        container_to_scan = content_container if content_container else div_soup

        # Iterate content tags to preserve order
        for child in container_to_scan.find_all(['p', 'h2', 'h3', 'li', 'ul', 'ol']):
            if child.name == 'ul' or child.name == 'ol':
                continue # Scan individual li children instead
                
            text = child.get_text(strip=True)
            if not text:
                continue

            # Extract Links
            links = []
            for a in child.find_all('a', href=True):
                url = a.get('href')
                anchor = a.get_text(strip=True)
                if url and anchor:
                    links.append(LinkRef(
                        url=url,
                        anchor_text=anchor,
                        section_id=section_id
                    ))

            # Block Type mapping
            b_type = 'paragraph'
            if child.name in ['h2', 'h3']:
                b_type = 'subheading'
            elif child.name == 'li':
                b_type = 'bullet'

            blocks.append(ContentBlock(
                type=b_type,
                text=text,
                links=links
            ))

        if not blocks:
            return None

        # Heuristic splitting flag
        # Splits World Roundup/News briefs roundups
        needs_split = (
            len([b for b in blocks if b.type == 'bullet']) > 4 and
            len([b for b in blocks if b.type == 'subheading']) == 0 and
            category.upper() in ['WORLD', 'NEWS', 'ANOTHER LAYER']
        )

        return ContentSection(
            id=section_id,
            category=category,
            title=title,
            content_blocks=blocks,
            image_url=img_url,
            image_caption=img_caption,
            is_sponsored=False,
            needs_gemini_split=needs_split
        )

    def _parse_tickers(self, soup) -> List[MarketTicker]:
        tickers = []
        table = soup.find('table', class_=re.compile(r'(markets|ticker)'))
        if not table:
            return tickers

        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all(['td', 'th'])
            if len(cells) >= 3:
                symbol = cells[0].get_text(strip=True)
                value = cells[1].get_text(strip=True)
                change = cells[2].get_text(strip=True)
                
                # Detect direction
                direction = 'up'
                img = row.find('img')
                if img and img.get('src') and 'down' in img.get('src').lower():
                    direction = 'down'
                elif '-' in change:
                    direction = 'down'

                if symbol and value:
                    tickers.append(MarketTicker(
                        symbol=symbol,
                        value=value,
                        change=change,
                        direction=direction
                    ))
        return tickers

    def _extract_word_of_day(self, soup) -> Optional[str]:
        # Usually inside some specific headers or bold paragraphs
        for tag in soup.find_all(['p', 'div', 'td']):
            text = tag.get_text()
            if 'WORD OF THE DAY' in text.upper():
                match = re.search(r'WORD OF THE DAY[:\-\s]+([A-Za-z]+)', text, re.IGNORECASE)
                if match:
                    return match.group(1)
        return None

    def _normalize_issue_id(self, date_value: str) -> str:
        """Return YYYY-MM-DD for Firestore document ids."""
        if not date_value:
            return datetime.utcnow().strftime('%Y-%m-%d')
        if 'T' in date_value:
            return date_value.split('T')[0]
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_value):
            return date_value
        try:
            return datetime.strptime(date_value[:10], '%Y-%m-%d').strftime('%Y-%m-%d')
        except ValueError:
            return datetime.utcnow().strftime('%Y-%m-%d')

    def _format_human_date(self, issue_id: str) -> str:
        try:
            dt = datetime.strptime(issue_id, '%Y-%m-%d')
            return dt.strftime('%B %d, %Y')
        except ValueError:
            return issue_id
