from typing import List
from models import BrewIssue, Slide, ContentSection, LinkRef


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

        slides.append(Slide(
            id=f"intro_{order:03d}",
            type="intro",
            section_id="intro",
            section_label="OVERVIEW",
            title="Today's Brew",
            body=issue.intro,
            image_url=issue.primary_image_url,
            links=[],
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

        for section in issue.sections:
            sec_slides, next_order = self.build_section_slides(section, order)
            slides.extend(sec_slides)
            order = next_order

        return slides

    def build_section_slides(self, section: ContentSection, start_order: int) -> tuple[List[Slide], int]:
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

        for b_idx, block in enumerate(section.content_blocks):
            if block.text.strip().lower() == section.title.strip().lower():
                continue

            body_links = [link for link in block.links if self._is_body_content_link(link, section)]

            if body_links:
                all_links.extend(body_links)

            slide_type = "body"
            body_text = block.text
            title_text = ""

            if block.type == "bullet":
                slide_type = "bullet"
            elif block.type == "subheading":
                slide_type = "body"
                title_text = block.text

            slides.append(Slide(
                id=f"{sec_id}_block_{b_idx:02d}_{order:03d}",
                type=slide_type,
                section_id=sec_id,
                section_label=section.category,
                title=title_text,
                body=body_text,
                body_html=block.body_html,
                links=body_links,
                order=order
            ))
            order += 1

        if all_links:
            seen_urls = set()
            deduped_links = []
            for link in all_links:
                if link.url not in seen_urls:
                    seen_urls.add(link.url)
                    deduped_links.append(link)

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
