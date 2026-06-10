import type { LinkRef } from '@lib/models';

const REDIRECT_PARAMS = ['url', 'redirect', 'u', 'target', 'link', 'destination'];
const TRACKING_HOSTS = /(?:^|\.)morningbrew\.com$|(?:^|\.)links\.morningbrew\.com$/i;
const GENERIC_IMAGE_HOSTS =
  /(?:^|\.)unsplash\.com$|(?:^|\.)images\.unsplash\.com$|(?:^|\.)cloudinary\.com$/i;

function extractHostname(urlStr: string): string | null {
  if (!urlStr.trim()) {
    return null;
  }

  try {
    const normalized = /^https?:\/\//i.test(urlStr) ? urlStr : `https://${urlStr}`;
    const url = new URL(normalized);

    for (const param of REDIRECT_PARAMS) {
      const nested = url.searchParams.get(param);
      if (nested) {
        return extractHostname(decodeURIComponent(nested));
      }
    }

    return url.hostname.replace(/^www\./i, '');
  } catch {
    const match = urlStr.match(/(?:https?:\/\/)?(?:www\.)?([^/?#]+)/i);
    return match?.[1]?.replace(/^www\./i, '') ?? null;
  }
}

function isTrackingHost(hostname: string | null): boolean {
  return Boolean(hostname && TRACKING_HOSTS.test(hostname));
}

export function getLinkDomain(urlStr: string): string {
  return extractHostname(urlStr) ?? 'external link';
}

export function getLinkDisplayDomain(link: LinkRef): string {
  if (link.domain?.trim()) {
    return link.domain.replace(/^www\./i, '');
  }

  const urlDomain = getLinkDomain(link.url);
  if (!isTrackingHost(urlDomain)) {
    return urlDomain;
  }

  if (link.og_image) {
    const imageDomain = getLinkDomain(link.og_image);
    if (imageDomain && !isTrackingHost(imageDomain) && !GENERIC_IMAGE_HOSTS.test(imageDomain)) {
      return imageDomain;
    }
  }

  return urlDomain;
}
