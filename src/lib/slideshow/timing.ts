export const SECTION_HERO_DURATION_MS = 3000;
export const LINK_CARD_DURATION_MS = 6000;
export const MIN_READ_DURATION_MS = 3500;

export function estimateDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(MIN_READ_DURATION_MS, (words / 2.5) * 1000);
}
