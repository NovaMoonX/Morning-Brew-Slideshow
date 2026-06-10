import type { Slide } from '@lib/models';

export function showsTopSlideCountdown(type: Slide['type']): boolean {
  return (
    type !== 'section_hero' &&
    type !== 'link_cards' &&
    type !== 'end' &&
    type !== 'extras_hub'
  );
}
