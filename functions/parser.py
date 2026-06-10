import json
import re
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Optional, List, Dict, Tuple, Any
import requests
from models import BrewIssue, ContentSection, ContentBlock, LinkRef, MarketTicker

class MorningBrewParser:
    SKIP_CATEGORIES = {
        'SHARE THE BREW', 'QUIZ', 'READER POLL',
        'GAMES', 'SHARE', 'SPONSORED', 'AD', 'PROMOTION'
    }
    EXTRA_CATEGORIES = {'RECS', 'PLAY', 'ANSWER'}

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
        title = self._resolve_title(issue_data, subject_line)
        
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
        
        # 2. Parse opening blurb (Salud / drink-of-summer section before MARKETS)
        intro_blocks = self._parse_top_blurb(body_soup)
        intro_text = "\n\n".join(block.text for block in intro_blocks)
        if not intro_text:
            intro_text = self._parse_intro_fallback(issue_data.get('previewText'))

        # 3. Parse Financial Tickers + markets commentary
        tickers = self._parse_tickers(body_soup)
        markets_commentary = self._parse_markets_commentary(body_soup)

        # 4. Parse Sections
        sections = []
        extra_sections = []
        word_of_day_html = None
        word_of_day = None
        story_roots: List = []
        seen_roots = set()

        for div in body_soup.find_all(class_='story-container'):
            root_id = id(div)
            if root_id not in seen_roots:
                seen_roots.add(root_id)
                story_roots.append(div)

        for container in body_soup.find_all(class_='story-content-container'):
            if container.find_parent(class_='story-container'):
                continue
            root_id = id(container)
            if root_id not in seen_roots:
                seen_roots.add(root_id)
                story_roots.append(container)

        # Fallback if class not c6/story-container
        if not story_roots:
            for div in body_soup.find_all('div', class_=re.compile(r'(c6|story)')):
                root_id = id(div)
                if root_id not in seen_roots:
                    seen_roots.add(root_id)
                    story_roots.append(div)

        for index, div in enumerate(story_roots):
            section = self._parse_section(div, f"sec_{index:03d}")
            if not section:
                continue

            category = section.category.upper()

            if category in self.EXTRA_CATEGORIES:
                extra_sections.append(section)
                if category == 'ANSWER':
                    wotd_word, wotd_html = self._extract_word_of_day_from_section(section)
                    if wotd_word:
                        word_of_day = wotd_word
                    if wotd_html:
                        word_of_day_html = wotd_html
                continue

            if section.title.strip().lower() == 'story highlight':
                continue

            if category in self.SKIP_CATEGORIES:
                continue
            if self.skip_sponsored and section.is_sponsored:
                continue
            sections.append(section)

        # Main news ends at "What else is brewing" — drop anything after it from the deck
        brewing_idx = next(
            (index for index, section in enumerate(sections) if section.is_what_else_is_brewing),
            None,
        )
        if brewing_idx is not None:
            tail = sections[brewing_idx + 1:]
            sections = sections[: brewing_idx + 1]
            for section in tail:
                cat = section.category.upper()
                if cat in ('RECS', 'PLAY'):
                    extra_sections.append(section)
                elif cat == 'ANSWER':
                    extra_sections.append(section)
                    wotd_word, wotd_html = self._extract_word_of_day_from_section(section)
                    if wotd_word:
                        word_of_day = wotd_word
                    if wotd_html:
                        word_of_day_html = wotd_html

        # 5. Word of Day fallback scan
        if not word_of_day:
            word_of_day = self._extract_word_of_day(body_soup)

        return BrewIssue(
            id=issue_id,
            date=self._format_human_date(issue_id),
            title=title,
            subject_line=subject_line,
            primary_image_url=primary_image,
            intro=intro_text,
            intro_blocks=intro_blocks,
            tickers=tickers,
            sections=sections,
            extra_sections=extra_sections,
            markets_commentary=markets_commentary,
            word_of_day=word_of_day,
            word_of_day_html=word_of_day_html,
            fetched_at=datetime.utcnow(),
            status='ready'
        )

    def _is_tour_de_headlines(self, title: str) -> bool:
        return 'tour de headlines' in title.strip().lower()

    def _is_what_else_is_brewing(self, title: str) -> bool:
        return 'what else is brewing' in title.strip().lower()

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

        if title.strip().lower() == 'story highlight' and category.upper() in self.EXTRA_CATEGORIES:
            title = category.strip().title() if category else title

        # Skip ads early
        if 'AD' in category.upper() or 'SPONSORED' in category.upper():
            return None

        # Image from header-image-container only; skip photo credit / citation
        img_url = None
        img_container = div_soup.find(class_='header-image-container')
        if img_container:
            img_tag = img_container.find('img')
            if img_tag and img_tag.get('src'):
                img_url = img_tag.get('src')
        elif div_soup.find('img'):
            img_tag = div_soup.find('img')
            if img_tag and img_tag.get('src'):
                img_url = img_tag.get('src')

        # Content blocks
        blocks = []
        content_container = div_soup.find(class_=re.compile(r'(content-container|body|story-content)'))
        scan_roots: List = []
        if content_container:
            scan_roots.append(content_container)
        if not scan_roots:
            scan_roots.append(div_soup)

        seen_nodes = set()
        for root in scan_roots:
            for child in root.find_all(['p', 'h2', 'h3', 'li']):
                if id(child) in seen_nodes:
                    continue
                if child.name != 'li' and child.find_parent('li'):
                    continue
                seen_nodes.add(id(child))

                text = child.get_text(strip=True)
                if not text:
                    continue

                # Skip title, category, and image-credit lines
                if text.strip().lower() == title.strip().lower():
                    continue
                if child.find_parent(class_=re.compile(r'(title-container|tag-container|header-image-container)')):
                    continue
                if child.find(class_='source') and len(text) < 120:
                    continue
                if child.name == 'placementslot':
                    continue
                child_classes = child.get('class') or []
                if 'h1' in child_classes:
                    continue

                blocks.append(self._content_block_from_element(child, section_id, title))

        if not blocks:
            return None

        is_tour = self._is_tour_de_headlines(title)
        is_brewing = self._is_what_else_is_brewing(title)

        # Heuristic splitting flag
        # Splits World Roundup/News briefs roundups
        needs_split = (
            not is_tour and
            not is_brewing and
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
            image_caption=None,
            is_sponsored=False,
            needs_gemini_split=needs_split,
            is_tour_de_headlines=is_tour,
            is_what_else_is_brewing=is_brewing,
        )

    def _content_block_from_element(self, child, section_id: str, section_title: str) -> ContentBlock:
        text = child.get_text(strip=True)
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

        b_type = 'paragraph'
        if child.name in ['h2', 'h3']:
            b_type = 'subheading'
        elif child.name == 'li':
            parent_list = child.find_parent(['ol', 'ul'])
            b_type = 'ordered_bullet' if parent_list and parent_list.name == 'ol' else 'bullet'

        return ContentBlock(
            type=b_type,
            text=text,
            body_html=self._inline_html(child),
            links=links
        )

    def _parse_blocks_from_root(self, root, section_id: str, section_title: str) -> List[ContentBlock]:
        blocks: List[ContentBlock] = []
        seen_nodes = set()
        for child in root.find_all(['p', 'h2', 'h3', 'li']):
            if id(child) in seen_nodes:
                continue
            if child.name != 'li' and child.find_parent('li'):
                continue
            seen_nodes.add(id(child))

            text = child.get_text(strip=True)
            if not text:
                continue
            if text.strip().lower() == section_title.strip().lower():
                continue
            if child.find(class_='source') and len(text) < 120:
                continue

            blocks.append(self._content_block_from_element(child, section_id, section_title))
        return blocks

    def _inline_html(self, element) -> str:
        """Preserve inline links and emphasis from newsletter HTML."""
        parts: List[str] = []
        for child in element.children:
            name = getattr(child, 'name', None)
            if name == 'a' and child.get('href'):
                href = child.get('href')
                label = child.get_text(strip=True)
                if label:
                    parts.append(
                        f'<a href="{href}" target="_blank" rel="noopener noreferrer">{label}</a>'
                    )
            elif name in ('strong', 'b', 'em', 'i', 'span'):
                inner = self._inline_html(child)
                if inner:
                    parts.append(f'<{name}>{inner}</{name}>')
            elif isinstance(child, str):
                parts.append(str(child))
            elif name:
                parts.append(child.get_text())
        html = ''.join(parts)
        # Collapse horizontal whitespace only — preserve leading/trailing spaces in text nodes.
        html = re.sub(r'[ \t]+', ' ', html)
        # Newsletter HTML often omits a space after closing inline tags.
        html = re.sub(r'(</(?:a|strong|b|em|i|span)>)(?=\w)', r'\1 ', html)
        html = re.sub(r'(\w)(<(?:a|strong|b|em|i|span)\b)', r'\1 \2', html)
        html = re.sub(r'(</(?:a|strong|b|em|i|span)>)(<span>)([A-Za-z])', r'\1\2 \3', html)
        html = re.sub(r'(</span><span>)([A-Za-z])', r'\1 \2', html)
        html = re.sub(r'(</(?:strong|b|em|i)>)([A-Za-z])', r'\1 \2', html)
        html = re.sub(r'(<(?:strong|b|em|i|span)[^>]*>[^<]*:)(</(?:strong|b|em|i|span)>)', r'\1 \2', html)
        return html

    def _parse_tickers(self, soup) -> List[MarketTicker]:
        tickers = []
        seen_symbols = set()

        for row in soup.find_all('tr'):
            ticker_cell = row.find(class_='markets-ticker-cell')
            value_cell = row.find(class_='markets-value-cell')
            bubble_cell = row.find(class_='markets-bubble-cell')
            if not ticker_cell or not value_cell:
                continue

            symbol = ticker_cell.get_text(strip=True)
            value = value_cell.get_text(strip=True)
            change = bubble_cell.get_text(strip=True) if bubble_cell else ''

            if not symbol or symbol in seen_symbols:
                continue
            seen_symbols.add(symbol)

            direction = 'down' if change.strip().startswith('-') else 'up'
            arrow = row.find('img', class_='markets-arrow')
            if arrow and arrow.get('src') and 'e4a85d043' in arrow.get('src'):
                direction = 'down'

            tickers.append(MarketTicker(
                symbol=symbol,
                value=value,
                change=change,
                direction=direction
            ))

        return tickers

    def _parse_markets_commentary(self, soup) -> List[ContentBlock]:
        blocks: List[ContentBlock] = []
        markets_header = None
        for tag in soup.find_all('p', class_='h3'):
            if tag.get_text(strip=True).upper() == 'MARKETS':
                markets_header = tag
                break
        if not markets_header:
            return blocks

        card = None
        for td in markets_header.parents:
            if td.name == 'td':
                classes = td.get('class') or []
                if 'table-head' in classes:
                    card = td
                    break
        if not card:
            return blocks

        for li in card.find_all('li'):
            text = li.get_text(strip=True)
            if not text or len(text) < 20:
                continue
            links = []
            for a in li.find_all('a', href=True):
                url = a.get('href')
                anchor = a.get_text(strip=True)
                if url and anchor:
                    links.append(LinkRef(url=url, anchor_text=anchor, section_id='markets'))
            blocks.append(ContentBlock(
                type='bullet',
                text=text,
                body_html=self._inline_html(li),
                links=links
            ))

        return blocks

    def _extract_word_of_day_from_section(
        self,
        section: ContentSection,
    ) -> tuple[Optional[str], Optional[str]]:
        for block in section.content_blocks:
            if 'word of the day' not in block.text.lower():
                continue
            match = re.search(
                r"word of the day is:\s*([A-Za-z]+)",
                block.text,
                re.IGNORECASE,
            )
            word = match.group(1) if match else None
            html = block.body_html or block.text
            return word, html
        return None, None

    def _extract_word_of_day(self, soup) -> Optional[str]:
        # Usually inside some specific headers or bold paragraphs
        for tag in soup.find_all(['p', 'div', 'td']):
            text = tag.get_text()
            if 'WORD OF THE DAY' in text.upper():
                match = re.search(r'WORD OF THE DAY[:\-\s]+([A-Za-z]+)', text, re.IGNORECASE)
                if match:
                    return match.group(1)
        return None

    def _resolve_title(self, issue_data: Dict[str, Any], subject_line: str) -> str:
        raw_title = (issue_data.get('title') or '').strip()
        if raw_title and raw_title.lower() != 'untitled':
            return raw_title
        if subject_line and subject_line != "Morning Brew Newsletter":
            return subject_line
        slug = (issue_data.get('slug') or '').strip()
        if slug:
            return slug.replace('-', ' ').title()
        return "Morning Brew"

    def _parse_top_blurb(self, soup) -> List[ContentBlock]:
        blurb = soup.find(class_='top-blurb-container')
        if not blurb:
            return []
        return self._parse_blocks_from_root(blurb, 'intro', "Today's Brew")

    def _parse_intro_fallback(self, preview_text: Optional[str]) -> str:
        if preview_text:
            return preview_text.strip()
        return "Welcome to today's edition of the Morning Brew. Let's walk through the latest global highlights."

    def _parse_intro(self, body_soup: BeautifulSoup, preview_text: Optional[str]) -> str:
        """Deprecated: kept for compatibility; use _parse_top_blurb instead."""
        blocks = self._parse_top_blurb(body_soup)
        if blocks:
            return "\n\n".join(block.text for block in blocks)
        return self._parse_intro_fallback(preview_text)

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
