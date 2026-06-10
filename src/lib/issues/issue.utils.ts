import type {
  BrewIssue,
  IssueStatus,
  LinkRef,
  Slide,
  SlideType,
} from '@lib/models';

const ALLOWED_STATUS: IssueStatus[] = [
  'ready',
  'enriched',
  'audio_ready',
  'failed',
];
const ALLOWED_SLIDE_TYPES: SlideType[] = [
  'cover',
  'intro',
  'markets',
  'section_hero',
  'body',
  'bullet',
  'link_cards',
  'brief_cards',
  'end',
];

function asText(value: unknown, fallback = '') {
  const result = typeof value === 'string' ? value : fallback;
  return result;
}

function asNullableText(value: unknown) {
  const result = typeof value === 'string' ? value : null;
  return result;
}

function asNumber(value: unknown, fallback = 0) {
  const result = typeof value === 'number' ? value : fallback;
  return result;
}

function asLinks(value: unknown): LinkRef[] {
  if (!Array.isArray(value)) {
    const empty: LinkRef[] = [];
    return empty;
  }

  const result = value.map((link, index) => {
    const item = (link ?? {}) as Record<string, unknown>;
    const normalized: LinkRef = {
      url: asText(item.url),
      anchor_text: asText(item.anchor_text),
      section_id: asText(item.section_id),
      og_title: asNullableText(item.og_title),
      og_description: asNullableText(item.og_description),
      og_image: asNullableText(item.og_image),
      gemini_summary: asNullableText(item.gemini_summary),
      domain: asNullableText(item.domain),
    };
    const ensured = normalized.url
      ? normalized
      : { ...normalized, url: `#missing-link-${index}` };
    return ensured;
  });

  return result;
}

function asSlides(value: unknown): Slide[] {
  if (!Array.isArray(value)) {
    const empty: Slide[] = [];
    return empty;
  }

  const result = value.map((slide, index) => {
    const item = (slide ?? {}) as Record<string, unknown>;
    const typeCandidate = asText(item.type, 'body');
    const type = ALLOWED_SLIDE_TYPES.includes(typeCandidate as SlideType)
      ? (typeCandidate as SlideType)
      : 'body';

    const normalized: Slide = {
      id: asText(item.id, `slide_${String(index).padStart(3, '0')}`),
      type,
      section_id: asText(item.section_id),
      section_label: asText(item.section_label),
      title: asText(item.title, 'Untitled slide'),
      body: asText(item.body),
      body_html: asNullableText(item.body_html),
      image_url: asNullableText(item.image_url),
      image_caption: asNullableText(item.image_caption),
      links: asLinks(item.links),
      audio_url: asNullableText(item.audio_url),
      order: asNumber(item.order, index),
    };

    return normalized;
  });

  const sorted = result.sort((a, b) => a.order - b.order);
  return sorted;
}

export function getTodayIssueId() {
  const now = new Date();
  const result = now.toISOString().slice(0, 10);
  return result;
}

export function normalizeIssue(raw: unknown, fallbackId: string): BrewIssue {
  const item = (raw ?? {}) as Record<string, unknown>;
  const statusCandidate = asText(item.status, 'ready');
  const status = ALLOWED_STATUS.includes(statusCandidate as IssueStatus)
    ? (statusCandidate as IssueStatus)
    : 'ready';

  const normalized: BrewIssue = {
    id: asText(item.id, fallbackId),
    date: asText(item.date, fallbackId),
    title: asText(item.title, 'Morning Brew'),
    subject_line: asText(item.subject_line),
    primary_image_url: asNullableText(item.primary_image_url),
    intro: asText(item.intro),
    tickers: [],
    word_of_day: asNullableText(item.word_of_day),
    status,
    slides: asSlides(item.slides),
    fetched_at: asText(item.fetched_at, new Date().toISOString()),
  };

  const result = normalized;
  return result;
}
