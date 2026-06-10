import type { Slide } from '@lib/models';

export interface SectionContext {
  imageUrl: string | null;
  title: string | null;
  caption: string | null;
}

export function getSectionContext(slides: Slide[], sectionId: string): SectionContext {
  if (!sectionId || ['cover', 'intro', 'markets'].includes(sectionId)) {
    return { imageUrl: null, title: null, caption: null };
  }

  const sectionSlides = slides.filter((slide) => slide.section_id === sectionId);
  const hero = sectionSlides.find((slide) => slide.type === 'section_hero');
  const imageUrl =
    hero?.image_url ?? sectionSlides.find((slide) => slide.image_url)?.image_url ?? null;

  return {
    imageUrl,
    title: hero?.title ?? null,
    caption: hero?.image_caption ?? null,
  };
}

export function resolveSlideImage(
  slide: Slide,
  sectionContext: SectionContext,
  fallbackUrl: string,
): string {
  return slide.image_url ?? sectionContext.imageUrl ?? fallbackUrl;
}
