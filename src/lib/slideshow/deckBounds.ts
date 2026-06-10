import type { Slide } from '@lib/models';

export function getMainDeckLastIndex(slides: Slide[]): number {
  const hubIndex = slides.findIndex((slide) => slide.type === 'extras_hub');
  if (hubIndex >= 0) {
    return hubIndex;
  }

  const endIndex = slides.findIndex((slide) => slide.type === 'end');
  if (endIndex >= 0) {
    return endIndex;
  }

  return Math.max(slides.length - 1, 0);
}

export function isMainDeckSlide(slides: Slide[], index: number): boolean {
  return index <= getMainDeckLastIndex(slides);
}
