from typing import List, Optional
from bs4 import BeautifulSoup
from models import BrewIssue, Slide, ContentSection, LinkRef, ContentBlock


class SlideBuilder:
    def _is_body_content_link(self, link: LinkRef, section: ContentSection) -> bool:
        anchor = (link.anchor_text or '').strip().lower()
        title = section.title.strip().lower()
        category = section.category.strip().lower()
        if not anchor or anchor == title or anchor == category:
            return False
        if title and len(anchor) > 30 and (title in anchor or anchor in title):
            return False
        return True

    def _render_intro_html(self, blocks) -> str:
        parts = []
        for block in blocks:
            if block.body_html:
                if block.type == 'bullet':
                    parts.append(f'<p>{block.body_html}</p>')
                else:
                    parts.append(f'<p>{block.body_html}</p>')
            else:
                parts.append(f'<p>{block.text}</p>')
        return ''.join(parts)

    @staticmethod
    def _extract_tour_headline(block: ContentBlock) -> str:
        if block.body_html:
            soup = BeautifulSoup(block.body_html, 'html.parser')
            strong = soup.find('strong')
            if strong:
                headline = strong.get_text(strip=True).rstrip('.')
                if headline:
                    return headline

        first_sentence = block.text.split('.')[0].strip()
        return first_sentence or block.text.strip()

    @staticmethod
    def _tour_body_without_headline(block: ContentBlock, headline: str) -> tuple[str, Optional[str]]:
        body_text = block.text.strip()
        headline_key = headline.rstrip('.').strip()
        if headline_key and body_text.lower().startswith(headline_key.lower()):
            body_text = body_text[len(headline_key):].lstrip(' .')

        body_html = block.body_html
        if body_html:
            soup = BeautifulSoup(body_html, 'html.parser')
            strong = soup.find('strong')
            if strong:
                strong.decompose()
            cleaned = ''.join(str(child) for child in soup.children).strip()
            if cleaned:
                body_html = cleaned

        return body_text, body_html

    def build_slides(self, issue: BrewIssue) -> List[Slide]:
        slides = []
        order = 0

        slides.append(Slide(
            id=f"cover_{order:03d}",
            type="cover",
            section_id="cover",
            section_label="DAILY ISSUE",
            title=issue.title,
            body="",
            image_url=issue.primary_image_url,
            image_caption=issue.date,
            links=[],
            order=order
        ))
        order += 1

        intro_blocks = issue.intro_blocks or []
        intro_links = [link for block in intro_blocks for link in (block.links or [])]
        intro_html = self._render_intro_html(intro_blocks) if intro_blocks else None

        slides.append(Slide(
            id=f"intro_{order:03d}",
            type="intro",
            section_id="intro",
            section_label="OVERVIEW",
            title="Today's Brew",
            body=issue.intro,
            body_html=intro_html,
            image_url=issue.primary_image_url,
            links=intro_links,
            order=order
        ))
        order += 1

        if issue.tickers or issue.markets_commentary:
            market_lines = [
                f"• {t.symbol}: {t.value} ({t.change} {'▲' if t.direction == 'up' else '▼'})"
                for t in issue.tickers
            ]
            market_html_parts = [
                '<ul class="markets-list">'
                + ''.join(
                    f'<li><strong>{t.symbol}</strong> {t.value} '
                    f'<span>({t.change})</span></li>'
                    for t in issue.tickers
                )
                + '</ul>'
            ]
            for block in issue.markets_commentary:
                market_lines.append(f"• {block.text}")
                if block.body_html:
                    market_html_parts.append(f'<p>{block.body_html}</p>')

            slides.append(Slide(
                id=f"markets_{order:03d}",
                type="markets",
                section_id="markets",
                section_label="MARKETS",
                title="Financial Markets Today",
                body="\n".join(market_lines),
                body_html=''.join(market_html_parts),
                image_url=None,
                links=[link for block in issue.markets_commentary for link in block.links],
                order=order
            ))
            order += 1

        for section in self._main_sections(issue):
            sec_slides, next_order = self.build_section_slides(section, order)
            slides.extend(sec_slides)
            order = next_order

        hub_body = issue.word_of_day_html or (
            f"Today's Word of the Day: {issue.word_of_day}."
            if issue.word_of_day
            else "You've finished today's news."
        )
        slides.append(Slide(
            id=f"extras_hub_{order:03d}",
            type="extras_hub",
            section_id="extras",
            section_label="FIN",
            title="You're all caught up",
            body=hub_body if not issue.word_of_day_html else issue.word_of_day or '',
            body_html=issue.word_of_day_html,
            image_url=issue.primary_image_url,
            image_caption=issue.date,
            links=[],
            order=order,
        ))

        return slides

    def _main_sections(self, issue: BrewIssue) -> List[ContentSection]:
        """News deck sections only — stops after What else is brewing."""
        main: List[ContentSection] = []
        for section in issue.sections:
            if section.category.upper() in {'RECS', 'PLAY', 'ANSWER'}:
                continue
            if (
                section.title.strip().lower() == 'story highlight'
                and not section.is_what_else_is_brewing
            ):
                continue
            main.append(section)
            if section.is_what_else_is_brewing:
                break
        return main

    def build_extra_slides(self, issue: BrewIssue) -> dict:
        sections = list(issue.extra_sections or [])
        seen_keys = {
            (section.category.upper(), section.title.strip().lower())
            for section in sections
        }

        brewing_idx = next(
            (index for index, section in enumerate(issue.sections) if section.is_what_else_is_brewing),
            None,
        )
        if brewing_idx is not None:
            for section in issue.sections[brewing_idx + 1:]:
                cat = section.category.upper()
                if cat not in ('RECS', 'PLAY'):
                    continue
                key = (cat, section.title.strip().lower())
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                sections.append(section)

        result: dict = {}
        answer_section = self._find_answer_section(issue)
        for section in sections:
            category = section.category.upper()
            if category == 'ANSWER':
                continue
            extra_key = category.lower()
            answer_for_play = answer_section if extra_key == 'play' else None
            built = self._build_extra_section_slides(
                section,
                extra_key,
                answer_section=answer_for_play,
            )
            if built:
                result[extra_key] = built
        return result

    @staticmethod
    def _find_answer_section(issue: BrewIssue) -> Optional[ContentSection]:
        for section in issue.extra_sections or []:
            if section.category.upper() == 'ANSWER':
                return section
        return None

    @staticmethod
    def _answer_blocks_excluding_wotd(section: ContentSection) -> List[ContentBlock]:
        return [
            block for block in section.content_blocks
            if 'word of the day' not in block.text.lower()
        ]

    @staticmethod
    def _is_sponsor_footnote(block: ContentBlock) -> bool:
        text = block.text.lower()
        return (
            'message from our sponsor' in text
            or 'product recommendation from our writers' in text
        )

    def _build_extra_section_slides(
        self,
        section: ContentSection,
        extra_key: str,
        answer_section: Optional[ContentSection] = None,
    ) -> List[Slide]:
        blocks = [
            block for block in section.content_blocks
            if not self._is_sponsor_footnote(block)
            and block.text.strip().lower() != section.title.strip().lower()
        ]
        if not blocks:
            return []

        sec_id = f'extra_{extra_key}'
        title = section.category.upper()
        groups = [blocks]

        answer_blocks: List[ContentBlock] = []
        if extra_key == 'play' and answer_section:
            answer_blocks = self._answer_blocks_excluding_wotd(answer_section)

        slides: List[Slide] = []
        for group_index, group in enumerate(groups):
            slide = Slide(
                id=f"{sec_id}_{group_index:02d}",
                type='extra_content',
                section_id=sec_id,
                section_label=title,
                title=title if group_index == 0 else (
                    group[0].text if group and group[0].type == 'subheading' else title
                ),
                body=self._blocks_to_plain_text(group),
                body_html=self._blocks_to_html(group),
                image_url=section.image_url if group_index == 0 else None,
                links=self._collect_block_links(section, group),
                order=group_index,
            )
            if answer_blocks:
                slide.answer_body = self._blocks_to_plain_text(answer_blocks)
                slide.answer_body_html = self._blocks_to_html(answer_blocks)
                slide.answer_links = self._collect_block_links(answer_section, answer_blocks)
            slides.append(slide)
        return slides

    def build_section_slides(self, section: ContentSection, start_order: int) -> tuple[List[Slide], int]:
        if section.is_tour_de_headlines:
            return self._build_tour_de_headlines_slides(section, start_order)
        if section.is_what_else_is_brewing:
            return self._build_what_else_is_brewing_slides(section, start_order)
        return self._build_standard_section_slides(section, start_order)

    def _brief_card_from_block(self, block: ContentBlock, section_id: str) -> Optional[LinkRef]:
        primary = block.links[0] if block.links else None
        headline = (primary.anchor_text if primary else block.text.split('.')[0]).strip()
        if not headline:
            return None

        rest = block.text.strip()
        headline_key = headline.rstrip('.').strip()
        if headline_key and rest.lower().startswith(headline_key.lower()):
            rest = rest[len(headline_key):].lstrip(' ,."')

        url = primary.url if primary else ''
        if url == '#':
            url = ''

        return LinkRef(
            url=url,
            anchor_text=headline,
            section_id=section_id,
            og_description=rest or None,
        )

    def _build_what_else_is_brewing_slides(
        self,
        section: ContentSection,
        start_order: int,
    ) -> tuple[List[Slide], int]:
        slides = []
        order = start_order
        sec_id = section.id

        card_links: List[LinkRef] = []
        for block in section.content_blocks:
            if block.type != 'bullet':
                continue
            card = self._brief_card_from_block(block, sec_id)
            if card:
                card_links.append(card)

        if not card_links:
            return slides, order

        slides.append(Slide(
            id=f"{sec_id}_brief_{order:03d}",
            type="brief_cards",
            section_id=sec_id,
            section_label=section.category,
            title=section.title,
            body=f"{len(card_links)} more headlines",
            links=card_links,
            image_url=section.image_url,
            order=order,
        ))
        order += 1

        return slides, order

    def _build_tour_de_headlines_slides(
        self,
        section: ContentSection,
        start_order: int,
    ) -> tuple[List[Slide], int]:
        slides = []
        order = start_order
        sec_id = section.id

        slides.append(Slide(
            id=f"{sec_id}_hero_{order:03d}",
            type="section_hero",
            section_id=sec_id,
            section_label=section.category,
            title=section.title,
            body=section.title,
            image_url=section.image_url,
            links=[],
            order=order
        ))
        order += 1

        for b_idx, block in enumerate(section.content_blocks):
            if block.text.strip().lower() == section.title.strip().lower():
                continue

            headline = self._extract_tour_headline(block)
            body_text, body_html = self._tour_body_without_headline(block, headline)
            body_links = [link for link in block.links if self._is_body_content_link(link, section)]

            slides.append(Slide(
                id=f"{sec_id}_headline_{b_idx:02d}_{order:03d}",
                type="body",
                section_id=sec_id,
                section_label=section.category,
                title=headline,
                body=body_text,
                body_html=body_html,
                links=body_links,
                image_url=None,
                order=order
            ))
            order += 1

        return slides, order

    def _bullet_list_html(self, bullet_blocks: List[ContentBlock]) -> str:
        items = []
        for block in bullet_blocks:
            inner = block.body_html or block.text
            items.append(f'<li>{inner}</li>')
        return f'<ul class="slide-bullets">{"".join(items)}</ul>'

    def _ordered_list_html(self, bullet_blocks: List[ContentBlock]) -> str:
        items = []
        for block in bullet_blocks:
            inner = block.body_html or block.text
            items.append(f'<li>{inner}</li>')
        return f'<ol class="slide-ordered-list">{"".join(items)}</ol>'

    def _blocks_to_html(self, blocks: List[ContentBlock]) -> str:
        parts: List[str] = []
        i = 0
        while i < len(blocks):
            block = blocks[i]
            if block.type in ('bullet', 'ordered_bullet'):
                j = i
                list_type = block.type
                while j < len(blocks) and blocks[j].type == list_type:
                    j += 1
                if list_type == 'ordered_bullet':
                    parts.append(self._ordered_list_html(blocks[i:j]))
                else:
                    parts.append(self._bullet_list_html(blocks[i:j]))
                i = j
                continue

            if block.type == 'subheading':
                parts.append(f'<h3>{block.body_html or block.text}</h3>')
                i += 1
                continue

            if block.body_html:
                parts.append(f'<p>{block.body_html}</p>')
            else:
                parts.append(f'<p>{block.text}</p>')
            i += 1
        return ''.join(parts)

    def _blocks_to_plain_text(self, blocks: List[ContentBlock]) -> str:
        lines: List[str] = []
        for block in blocks:
            if block.type in ('bullet', 'ordered_bullet'):
                prefix = '•' if block.type == 'bullet' else '1.'
                lines.append(f'{prefix} {block.text}')
            else:
                lines.append(block.text)
        return '\n'.join(lines)

    def _collect_block_links(
        self,
        section: ContentSection,
        blocks: List[ContentBlock],
    ) -> List[LinkRef]:
        links: List[LinkRef] = []
        for block in blocks:
            links.extend(
                link for link in block.links if self._is_body_content_link(link, section)
            )
        return links

    def _make_content_group_slide(
        self,
        section: ContentSection,
        sec_id: str,
        order: int,
        b_idx: int,
        header_block: Optional[ContentBlock],
        content_blocks: List[ContentBlock],
        slide_id_suffix: str = 'group',
    ) -> Slide:
        title = ''
        blocks_to_render = list(content_blocks)

        if header_block:
            if header_block.type == 'subheading':
                title = header_block.text.strip()
            else:
                blocks_to_render = [header_block] + blocks_to_render

        body_links = self._collect_block_links(section, blocks_to_render)

        return Slide(
            id=f"{sec_id}_{slide_id_suffix}_{b_idx:02d}_{order:03d}",
            type='body',
            section_id=sec_id,
            section_label=section.category,
            title=title,
            body=self._blocks_to_plain_text(blocks_to_render),
            body_html=self._blocks_to_html(blocks_to_render),
            links=body_links,
            order=order,
        )

    def _build_standard_section_slides(
        self,
        section: ContentSection,
        start_order: int,
    ) -> tuple[List[Slide], int]:
        slides = []
        order = start_order
        sec_id = section.id

        slides.append(Slide(
            id=f"{sec_id}_hero_{order:03d}",
            type="section_hero",
            section_id=sec_id,
            section_label=section.category,
            title=section.title,
            body=section.title,
            image_url=section.image_url,
            links=[],
            order=order
        ))
        order += 1

        all_links: List[LinkRef] = []

        blocks = [
            block
            for block in section.content_blocks
            if block.text.strip().lower() != section.title.strip().lower()
        ]

        i = 0
        while i < len(blocks):
            block = blocks[i]

            if block.type == 'subheading':
                j = i + 1
                while j < len(blocks) and blocks[j].type != 'subheading':
                    j += 1
                group_blocks = blocks[i + 1:j]
                slide = self._make_content_group_slide(
                    section, sec_id, order, i, block, group_blocks, 'section'
                )
                slides.append(slide)
                all_links.extend(slide.links)
                order += 1
                i = j
                continue

            if block.type == 'paragraph':
                j = i + 1
                while j < len(blocks) and blocks[j].type == 'bullet':
                    j += 1
                if j > i + 1:
                    bullet_blocks = blocks[i + 1:j]
                    slide = self._make_content_group_slide(
                        section, sec_id, order, i, block, bullet_blocks, 'bullets'
                    )
                    slides.append(slide)
                    all_links.extend(slide.links)
                    order += 1
                    i = j
                    continue

            if block.type == 'bullet':
                j = i
                while j < len(blocks) and blocks[j].type == 'bullet':
                    j += 1
                bullet_blocks = blocks[i:j]
                slide = self._make_content_group_slide(
                    section, sec_id, order, i, None, bullet_blocks, 'bullets'
                )
                slides.append(slide)
                all_links.extend(slide.links)
                order += 1
                i = j
                continue

            body_links = [link for link in block.links if self._is_body_content_link(link, section)]
            if body_links:
                all_links.extend(body_links)

            slides.append(Slide(
                id=f"{sec_id}_block_{i:02d}_{order:03d}",
                type='body',
                section_id=sec_id,
                section_label=section.category,
                title='',
                body=block.text,
                body_html=block.body_html,
                links=body_links,
                order=order,
            ))
            order += 1
            i += 1

        if all_links:
            seen_urls = set()
            deduped_links = []
            for link in all_links:
                if link.url not in seen_urls:
                    seen_urls.add(link.url)
                    deduped_links.append(link)

            if deduped_links:
                slides.append(Slide(
                    id=f"{sec_id}_links_{order:03d}",
                    type="link_cards",
                    section_id=sec_id,
                    section_label="EXPLORE MORE",
                    title="Want to know more?",
                    body="",
                    links=deduped_links,
                    order=order
                ))
                order += 1

        return slides, order
