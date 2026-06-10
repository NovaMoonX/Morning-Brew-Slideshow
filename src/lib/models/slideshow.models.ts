export type IssueStatus = 'ready' | 'enriched' | 'audio_ready' | 'failed';

export interface LinkRef {
  url: string;
  anchor_text: string;
  section_id: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  gemini_summary: string | null;
  domain?: string | null;
}

export type SlideType =
  | 'cover'
  | 'intro'
  | 'markets'
  | 'section_hero'
  | 'body'
  | 'bullet'
  | 'link_cards'
  | 'brief_cards'
  | 'end';

export interface Slide {
  id: string;
  type: SlideType;
  section_id: string;
  section_label: string;
  title: string;
  body: string;
  body_html?: string | null;
  image_url: string | null;
  image_caption: string | null;
  links: LinkRef[];
  audio_url: string | null;
  order: number;
}

export interface MarketTicker {
  symbol: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
}

export interface BrewIssue {
  id: string;
  date: string;
  title: string;
  subject_line: string;
  primary_image_url: string | null;
  intro: string;
  tickers: MarketTicker[];
  word_of_day: string | null;
  status: IssueStatus;
  slides: Slide[];
  fetched_at: string;
}
