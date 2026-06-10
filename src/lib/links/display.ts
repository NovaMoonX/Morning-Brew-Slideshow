import type { LinkRef } from '@lib/models';
import { getLinkDisplayDomain } from '@lib/links/domain';

const PATH_NOISE = new Set([
  'world',
  'asia',
  'europe',
  'articles',
  'article',
  'news',
  'politics',
  'business',
  'opinion',
  'story',
  'stories',
  'live',
  'us',
  'uk',
]);

export function titleFromUrl(url: string): string | null {
  let pathname = '';
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const meaningful = segments.filter(
    (segment) => !/^\d{1,4}$/.test(segment) && !PATH_NOISE.has(segment.toLowerCase()),
  );
  const slugSource = meaningful.length > 0 ? meaningful : segments;
  let slug = slugSource[slugSource.length - 1] ?? '';
  slug = slug.replace(/\.(html?|php|aspx)$/i, '');
  slug = slug.replace(/-[a-f0-9]{8,}$/i, '');
  slug = slug.replace(/-/g, ' ').trim();

  if (slug.length < 4) {
    return null;
  }

  return slug.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isWeakAnchor(anchorText: string): boolean {
  const anchor = anchorText.trim();
  if (!anchor) {
    return true;
  }
  if (anchor.includes(' ')) {
    return false;
  }
  return anchor.length <= 20;
}

export function getLinkDisplayTitle(link: LinkRef): string {
  if (link.og_title?.trim()) {
    return link.og_title.trim();
  }
  if (!isWeakAnchor(link.anchor_text)) {
    return link.anchor_text.trim();
  }
  const fromUrl = titleFromUrl(link.url);
  if (fromUrl) {
    return fromUrl;
  }
  return `Article on ${getLinkDisplayDomain(link)}`;
}

export function getLinkDisplayDescription(link: LinkRef): string {
  if (link.gemini_summary?.trim()) {
    return link.gemini_summary.trim();
  }
  if (link.og_description?.trim()) {
    return link.og_description.trim();
  }
  const domain = getLinkDisplayDomain(link);
  const title = getLinkDisplayTitle(link);
  return `Read the full story on ${domain}: ${title}.`;
}

export function getLinkDisplayImage(
  link: LinkRef,
  sectionImageUrl?: string | null,
): string {
  if (link.og_image?.trim()) {
    return link.og_image.trim();
  }
  if (sectionImageUrl?.trim()) {
    return sectionImageUrl.trim();
  }
  return 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&auto=format&fit=crop&q=80';
}
