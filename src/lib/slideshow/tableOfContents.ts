import type { Slide } from '@lib/models';

export interface TocEntry {
  slideIndex: number;
  label: string;
  title: string;
  indent: number;
}

export function buildTableOfContents(slides: Slide[]): TocEntry[] {
  const entries: TocEntry[] = [];

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index];

    if (slide.type === 'cover') {
      entries.push({
        slideIndex: index,
        label: 'Daily Issue',
        title: slide.title || 'Morning Brew',
        indent: 0,
      });
      continue;
    }

    if (slide.type === 'intro') {
      entries.push({
        slideIndex: index,
        label: 'Overview',
        title: slide.title || "Today's Brew",
        indent: 0,
      });
      continue;
    }

    if (slide.type === 'markets') {
      entries.push({
        slideIndex: index,
        label: 'Markets',
        title: slide.title || 'Financial Markets Today',
        indent: 0,
      });
      continue;
    }

    if (slide.type === 'section_hero') {
      entries.push({
        slideIndex: index,
        label: slide.section_label,
        title: slide.title,
        indent: 0,
      });
      continue;
    }

    if (slide.id.includes('_headline_') && slide.title) {
      entries.push({
        slideIndex: index,
        label: slide.section_label,
        title: slide.title,
        indent: 1,
      });
    }
  }

  return entries;
}
