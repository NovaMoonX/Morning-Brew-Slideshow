import type { BrewIssue } from '@lib/models';

const today = new Date();
const id = today.toISOString().slice(0, 10);

export const MOCK_ISSUE: BrewIssue = {
  id,
  date: today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
  title: 'Morning Brew Slideshow Demo Issue',
  subject_line: 'Your AI-powered Morning Brew, in slides',
  primary_image_url: null,
  intro:
    'Firebase is not configured yet, so this demo issue is rendered locally.',
  tickers: [
    { symbol: 'S&P 500', value: '5,302', change: '+0.54%', direction: 'up' },
    { symbol: 'NASDAQ', value: '16,920', change: '-0.18%', direction: 'down' },
  ],
  word_of_day: 'Compounding',
  status: 'audio_ready',
  fetched_at: new Date().toISOString(),
  slides: [
    {
      id: 'cover_000',
      type: 'cover',
      section_id: 'cover',
      section_label: 'MORNING BREW',
      title: 'Morning Brew Slideshow',
      body: "Swipe through today's demo slideshow while you connect Firebase.",
      image_url: null,
      image_caption: null,
      links: [],
      audio_url: null,
      order: 0,
    },
    {
      id: 'intro_001',
      type: 'intro',
      section_id: 'intro',
      section_label: 'INTRO',
      title: 'Pipeline Stages',
      body: 'Stage one loads slides quickly. Stage two enriches links. Stage three swaps in high-fidelity Kokoro audio.',
      image_url: null,
      image_caption: null,
      links: [],
      audio_url: null,
      order: 1,
    },
    {
      id: 'links_002',
      type: 'link_cards',
      section_id: 'tech',
      section_label: 'TECH',
      title: 'Explore Sources',
      body: 'Enriched links include better metadata and optional Gemini summaries.',
      image_url: null,
      image_caption: null,
      links: [
        {
          url: 'https://www.morningbrew.com/',
          anchor_text: 'Morning Brew homepage',
          section_id: 'tech',
          og_title: 'Morning Brew',
          og_description: 'Business news in an engaging format.',
          og_image: null,
          gemini_summary: 'Daily business briefing with concise commentary.',
        },
      ],
      audio_url: null,
      order: 2,
    },
  ],
};
