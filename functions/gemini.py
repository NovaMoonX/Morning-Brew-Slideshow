import os
import re
import json
from typing import List, Optional
from models import ContentBlock, ContentSection

# ── Mock / Real switch ──────────────────────────────────────────────────────
# Set USE_MOCK_GEMINI=false in your environment to enable real Gemini calls.
USE_MOCK_GEMINI: bool = os.environ.get('USE_MOCK_GEMINI', 'true').lower() != 'false'

# Only import + configure the real SDK when needed
if not USE_MOCK_GEMINI:
    import google.generativeai as genai
    api_key = os.environ.get('GEMINI_API_KEY')
    if api_key:
        genai.configure(api_key=api_key)


class MockGeminiUtil:
    """Drop-in Gemini mock. Returns content unchanged — no API calls.

    To switch to the real implementation, set USE_MOCK_GEMINI=false and
    provide a GEMINI_API_KEY in your environment variables.
    """

    def split_section(self, section: ContentSection) -> List[ContentBlock]:
        """Pass-through: returns content blocks unchanged."""
        return section.content_blocks

    def summarize_article(self, url: str, page_text: str) -> Optional[str]:
        """Pass-through: returns None (no summary generated)."""
        return None

    def summarize_link_metadata(
        self,
        url: str,
        domain: Optional[str] = None,
        anchor_text: Optional[str] = None,
    ) -> Optional[str]:
        """Mock: derive a short teaser from the URL slug."""
        from enrichment import LinkEnricher

        title = LinkEnricher.title_from_url(url)
        if not title:
            return None
        source = domain or 'the publisher'
        return f"Coverage from {source} on {title.lower()}."


def get_gemini_util():
    """Factory that returns MockGeminiUtil or GeminiUtil based on USE_MOCK_GEMINI."""
    if USE_MOCK_GEMINI:
        return MockGeminiUtil()
    return GeminiUtil()


class GeminiUtil:
    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.enabled = bool(os.environ.get('GEMINI_API_KEY'))

    def split_section(self, section: ContentSection) -> List[ContentBlock]:
        """Uses Gemini to split roundup sections (like World Roundup) into clean blocks."""
        if not self.enabled:
            print("Gemini API key missing. Skipping section splitting.")
            return section.content_blocks

        # Compile raw section text
        raw_text = "\n".join([f"- {b.text}" for b in section.content_blocks])
        
        prompt = f"""
You are parsing a newsletter section into discrete slide content.
The section category is "{section.category}".
Below is the raw content from this section. It contains multiple
distinct news items mixed together as bullet points.

Identify each distinct story and return a JSON array of objects. Each object
must contain exactly these fields:
  - "type": either "subheading" or "paragraph" or "bullet"
  - "text": the content for this block, cleaned, complete, and optimized for reading aloud

Return ONLY the raw JSON array. Do not wrap in markdown fences or add extra text.

Content:
{raw_text}
"""
        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(prompt)
            text_response = response.text.strip()
            
            # Remove markdown fence wrapper if present
            if text_response.startswith("```"):
                text_response = re.sub(r'^```(json)?\n', '', text_response)
                text_response = re.sub(r'\n```$', '', text_response)
                text_response = text_response.strip()

            blocks_data = json.loads(text_response)
            new_blocks = []
            for b in blocks_data:
                new_blocks.append(ContentBlock(
                    type=b.get('type', 'paragraph'),
                    text=b.get('text', '')
                ))
            if new_blocks:
                return new_blocks
        except Exception as e:
            print(f"Gemini splitting failed for section {section.id}: {e}")

        return section.content_blocks

    def summarize_article(self, url: str, page_text: str) -> Optional[str]:
        """Generates a natural, speech-optimized 2-3 sentence article summary."""
        if not self.enabled or not page_text:
            return None

        # Clamp characters to control cost/payload
        truncated_text = page_text[:3000]

        prompt = f"""
Summarize the following article text in 2-3 plain sentences.
Write naturally for someone who will HEAR this read aloud (TTS), not read it.
Do not start with "This article" or "The author says". Just state what happened.
Keep it simple, punchy, and conversational.

Article text:
{truncated_text}
"""
        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(prompt)
            summary = response.text.strip()
            return summary
        except Exception as e:
            print(f"Gemini summarization failed for {url}: {e}")
            return None

    def summarize_link_metadata(
        self,
        url: str,
        domain: Optional[str] = None,
        anchor_text: Optional[str] = None,
    ) -> Optional[str]:
        """Generate a teaser when OpenGraph scraping is blocked."""
        if not self.enabled:
            return MockGeminiUtil().summarize_link_metadata(url, domain, anchor_text)

        from enrichment import LinkEnricher

        inferred_title = LinkEnricher.title_from_url(url)
        prompt = f"""
Write a 1-2 sentence teaser for a news article based on its URL and source.
Write naturally for someone who will hear this read aloud.
Do not mention paywalls, subscriptions, or that you inferred this from a URL.

URL: {url}
Source: {domain or 'unknown'}
Newsletter link text: {anchor_text or 'none'}
Inferred topic from URL: {inferred_title or 'unknown'}

Return only the teaser text.
"""
        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(prompt)
            summary = response.text.strip()
            return summary or None
        except Exception as e:
            print(f"Gemini link metadata failed for {url}: {e}")
            return MockGeminiUtil().summarize_link_metadata(url, domain, anchor_text)
