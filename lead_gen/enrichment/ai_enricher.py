import json
import logging
import re
from typing import Optional

from openai import AsyncOpenAI

from lead_gen.config import settings

logger = logging.getLogger(__name__)

DECISION_MAKER_TITLES = [
    "CEO", "Chief Executive Officer", "Founder", "Co-Founder", "Owner",
    "President", "Managing Partner", "Partner", "Director of Real Estate",
    "Operations Director", "Director of Operations", "Franchise Owner",
    "COO", "Chief Operating Officer", "VP Operations", "Vice President",
    "General Manager", "Managing Director", "Principal", "Proprietor",
]


class AIEnricher:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                raise RuntimeError("OPENAI_API_KEY not set in .env")
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def extract_contacts(self, page_text: str, business_name: str) -> list[dict]:
        """Extract decision makers from website page text."""
        if not page_text or len(page_text) < 50:
            return []

        client = self._get_client()
        prompt = f"""Extract decision makers from this business website text for "{business_name}".

Only include people with these titles: {', '.join(DECISION_MAKER_TITLES)}.

Website text:
{page_text[:6000]}

Return a JSON array. Each object must have these fields:
- full_name: string or null
- title: string or null
- email: string or null (only if it contains @)
- phone: string or null
- linkedin_url: string or null (only if it's a linkedin.com/in/ URL)

Rules:
- Return [] if no decision makers found
- Never guess or invent data — null if not present
- Only include people explicitly mentioned with a decision-maker title"""

        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1000,
                temperature=0,
            )
            raw = response.choices[0].message.content
            data = json.loads(raw)

            # Handle both {"contacts": [...]} and direct array wrapped in object
            if isinstance(data, dict):
                contacts = data.get("contacts", data.get("people", data.get("results", [])))
            else:
                contacts = data

            return [c for c in contacts if c.get("full_name") or c.get("title")]
        except Exception as e:
            logger.error(f"Contact extraction error: {e}")
            return []

    async def summarize_business(self, page_text: str, business_name: str) -> dict:
        """Extract business signals useful for CRE scoring."""
        if not page_text or len(page_text) < 50:
            return {}

        client = self._get_client()
        prompt = f"""Analyze this business website text for "{business_name}" and extract facts useful for commercial real estate analysis.

Website text:
{page_text[:6000]}

Return JSON with exactly these fields:
{{
  "company_size_estimate": "1-10" | "11-50" | "51-200" | "200+" | null,
  "years_in_business": integer or null,
  "multiple_locations": true | false,
  "recent_expansion_signals": true | false,
  "owns_property_signals": true | false,
  "industry_confirmed": string or null,
  "description": "1-2 sentence summary of what this business does"
}}

Base your answers strictly on text evidence. Use null/false when uncertain."""

        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=400,
                temperature=0,
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Business summarization error: {e}")
            return {}

    def normalize_title(self, raw_title: str) -> str:
        """Map a raw title string to a normalized decision-maker title."""
        if not raw_title:
            return raw_title
        t = raw_title.lower()
        if any(x in t for x in ["ceo", "chief executive"]):
            return "CEO"
        if any(x in t for x in ["founder", "co-founder"]):
            return "Founder"
        if "owner" in t and "co" not in t:
            return "Owner"
        if "co-owner" in t or "co owner" in t:
            return "Co-Owner"
        if "president" in t:
            return "President"
        if "managing partner" in t:
            return "Managing Partner"
        if "partner" in t:
            return "Partner"
        if "coo" in t or "chief operating" in t:
            return "COO"
        if any(x in t for x in ["vp", "vice president"]):
            return "VP Operations"
        if "director of real estate" in t:
            return "Director of Real Estate"
        if any(x in t for x in ["director of operations", "operations director"]):
            return "Operations Director"
        if "general manager" in t:
            return "General Manager"
        if "franchise" in t and "owner" in t:
            return "Franchise Owner"
        return raw_title.title()
