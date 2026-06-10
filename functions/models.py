from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Optional

@dataclass
class LinkRef:
    url: str
    anchor_text: str
    section_id: str
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    gemini_summary: Optional[str] = None
    domain: Optional[str] = None

    def to_dict(self):
        return asdict(self)

@dataclass
class Slide:
    id: str
    type: str  # 'cover' | 'intro' | 'markets' | 'section_hero' | 'body' | 'bullet' | 'link_cards' | 'brief_cards' | 'end'
    section_id: str
    section_label: str
    title: str
    body: str
    body_html: Optional[str] = None
    image_url: Optional[str] = None
    image_caption: Optional[str] = None
    links: List[LinkRef] = None
    audio_url: Optional[str] = None
    order: int = 0

    def __post_init__(self):
        if self.links is None:
            self.links = []

    def to_dict(self):
        result = asdict(self)
        result['links'] = [l.to_dict() for l in self.links]
        return result

@dataclass
class MarketTicker:
    symbol: str
    value: str
    change: str
    direction: str  # 'up' | 'down'

    def to_dict(self):
        return asdict(self)

@dataclass
class ContentBlock:
    type: str  # 'paragraph' | 'subheading' | 'bullet'
    text: str
    body_html: Optional[str] = None
    links: List[LinkRef] = None

    def __post_init__(self):
        if self.links is None:
            self.links = []

    def to_dict(self):
        result = asdict(self)
        result['links'] = [l.to_dict() for l in self.links]
        return result

@dataclass
class ContentSection:
    id: str
    category: str
    title: str
    content_blocks: List[ContentBlock]
    image_url: Optional[str] = None
    image_caption: Optional[str] = None
    is_sponsored: bool = False
    needs_gemini_split: bool = False
    is_tour_de_headlines: bool = False
    is_what_else_is_brewing: bool = False

    def to_dict(self):
        result = asdict(self)
        result['content_blocks'] = [b.to_dict() for b in self.content_blocks]
        return result

@dataclass
class BrewIssue:
    id: str  # YYYY-MM-DD
    date: str  # e.g., 'May 21, 2026'
    title: str
    subject_line: str
    primary_image_url: Optional[str]
    intro: str
    tickers: List[MarketTicker]
    sections: List[ContentSection]
    intro_blocks: List[ContentBlock] = None
    markets_commentary: List[ContentBlock] = None
    word_of_day: Optional[str] = None
    fetched_at: datetime = None
    status: str = 'ready'  # 'ready' | 'enriched' | 'audio_ready' | 'failed'
    slides: List[Slide] = None

    def __post_init__(self):
        if self.fetched_at is None:
            self.fetched_at = datetime.utcnow()
        if self.slides is None:
            self.slides = []
        if self.markets_commentary is None:
            self.markets_commentary = []
        if self.intro_blocks is None:
            self.intro_blocks = []

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date,
            'title': self.title,
            'subject_line': self.subject_line,
            'primary_image_url': self.primary_image_url,
            'intro': self.intro,
            'intro_blocks': [b.to_dict() for b in self.intro_blocks],
            'tickers': [t.to_dict() for t in self.tickers],
            'markets_commentary': [b.to_dict() for b in self.markets_commentary],
            'sections': [s.to_dict() for s in self.sections],
            'word_of_day': self.word_of_day,
            'fetched_at': self.fetched_at.isoformat() if isinstance(self.fetched_at, datetime) else self.fetched_at,
            'status': self.status,
            'slides': [sl.to_dict() for sl in self.slides]
        }
