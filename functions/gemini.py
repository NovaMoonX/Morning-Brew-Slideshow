import os
import json
import google.generativeai as genai
from typing import List, Optional
from models import ContentBlock, ContentSection

# Initialize Gemini API configuration
api_key = os.environ.get('GEMINI_API_KEY')
if api_key:
    genai.configure(api_key=api_key)

class GeminiUtil:
    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = model_name
        self.enabled = bool(api_key)

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
