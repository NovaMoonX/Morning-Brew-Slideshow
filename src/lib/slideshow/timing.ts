export const SECTION_HERO_DURATION_MS = 3000;
export const LINK_CARD_SECONDS_PER_LINK = 6;
export const MIN_READ_DURATION_MS = 3500;

export function linkCardDurationMs(linkCount: number): number {
  const count = Math.max(1, linkCount);
  return count * LINK_CARD_SECONDS_PER_LINK * 1000;
}

export function estimateDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_READ_DURATION_MS, (words / 2.5) * 1000);
}
