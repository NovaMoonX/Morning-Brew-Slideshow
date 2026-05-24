from typing import List
from models import BrewIssue, Slide, ContentSection, LinkRef

class SlideBuilder:
    def __init__(self):
        pass

    def build_slides(self, issue: BrewIssue) -> List[Slide]:
        slides = []
        order = 0

        # 1. Cover Slide
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

        # 2. Intro Slide
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

        # 3. Markets Slide (If tickers exist)
        if issue.tickers:
            market_body = "\n".join([
                f"• {t.symbol}: {t.value} ({t.change} {'▲' if t.direction == 'up' else '▼'})"
                for t in issue.tickers
            ])
            slides.append(Slide(
                id=f"markets_{order:03d}",
                type="markets",
                section_id="markets",
                section_label="MARKETS INDICATORS",
                title="Financial Markets Overview",
                body=market_body,
                links=[],
                order=order
            ))
            order += 1

        # 4. Process Each Section
        for sec_idx, section in enumerate(issue.sections):
            sec_slides, next_order = self.build_section_slides(section, order)
            slides.extend(sec_slides)
            order = next_order

        return slides

    def build_section_slides(self, section: ContentSection, start_order: int) -> tuple[List[Slide], int]:
        slides = []
        order = start_order
        sec_id = section.id

        # 1. Section Hero Slide
        slides.append(Slide(
            id=f"{sec_id}_hero_{order:03d}",
            type="section_hero",
            section_id=sec_id,
            section_label=section.category,
            title=section.title,
            body=f"{section.category}: {section.title}",
            image_url=section.image_url,
            image_caption=section.image_caption,
            links=[],
            order=order
        ))
        order += 1

        # Collect links across all slides in this section to pack in the final link_cards slide
        all_links = []

        # 2. Section Blocks
        for b_idx, block in enumerate(section.content_blocks):
            # Accumulate links
            if block.links:
                all_links.extend(block.links)

            slide_type = "body"
            body_text = block.text
            title_text = ""

            if block.type == "bullet":
                slide_type = "bullet"
            elif block.type == "subheading":
                slide_type = "body"
                body_text = f"Sub-heading: {block.text}"
                title_text = block.text

            slides.append(Slide(
                id=f"{sec_id}_block_{b_idx:02d}_{order:03d}",
                type=slide_type,
                section_id=sec_id,
                section_label=section.category,
                title=title_text,
                body=body_text,
                image_url=section.image_url if b_idx == 0 else None, # Only attach image to the first content slide if section hero doesn't suffice
                links=block.links,
                order=order
            ))
            order += 1

        # 3. Interstitial Link Cards Slide (If links exist in this section)
        if all_links:
            # Deduplicate links by URL
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
