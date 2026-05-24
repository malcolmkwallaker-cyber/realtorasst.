import json
import logging
from typing import Optional
from uuid import UUID

from openai import AsyncOpenAI

from lead_gen.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert commercial real estate broker assistant in Minnesota.
You write outreach that is concise, personalized, and value-focused — never generic or salesy.
You never open with "I hope this email finds you well" or similar clichés.
You focus on the business owner's perspective, not the broker's needs.
You write like a trusted advisor, not a cold caller."""

OUTREACH_PROMPT = """Generate complete outreach materials for this CRE prospect.

Business: {business_name}
Industry: {industry}
City: {city}, MN
Contact: {contact_name} ({contact_title})
Primary CRE Angle: {angle}
Angle Context: {angle_context}

Return ONLY valid JSON with exactly these fields:
{{
  "cold_email_subject": "subject line (under 60 chars)",
  "cold_email_body": "3 paragraphs max, under 150 words total. No salutation line like Dear X — start with a hook.",
  "linkedin_message": "under 300 characters, conversational",
  "cold_call_opener": "30-second verbal script, natural speech, includes a question",
  "voicemail_script": "20-second voicemail, leave callback number placeholder",
  "followup_day3": "short 2-paragraph follow-up email",
  "followup_day7": "different angle, reference prior outreach briefly",
  "followup_day14": "breakup email — final outreach, leaves door open",
  "personalization_notes": "why this angle was chosen for this business"
}}"""

ANGLE_CONTEXT = {
    "tenant": "This business likely needs to lease commercial space — office, industrial, flex, or retail.",
    "owner_user": "This business is a good candidate to purchase commercial property for their own operations.",
    "expanding": "Signs suggest this company is growing and may need a larger or additional location.",
    "relocating": "This business may be outgrowing its current space or looking for better-suited facilities.",
    "investor": "This operator may be interested in acquiring commercial real estate as an investment.",
}


class OutreachGenerator:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                raise RuntimeError("OPENAI_API_KEY not set in .env")
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def generate_for_lead(
        self,
        business: dict,
        contact: Optional[dict],
        score: dict,
        angle: str = "auto",
    ) -> dict:
        if angle == "auto":
            angle = self._select_angle(score)

        contact_name = ""
        contact_title = ""
        if contact:
            contact_name = contact.get("full_name") or contact.get("first_name") or "Business Owner"
            contact_title = contact.get("title_normalized") or contact.get("title") or "Owner"

        client = self._get_client()
        prompt = OUTREACH_PROMPT.format(
            business_name=business.get("business_name", ""),
            industry=business.get("industry", ""),
            city=business.get("city", "Minnesota"),
            contact_name=contact_name or "Business Owner",
            contact_title=contact_title or "Owner",
            angle=angle.replace("_", " ").title(),
            angle_context=ANGLE_CONTEXT.get(angle, ANGLE_CONTEXT["tenant"]),
        )

        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                response_format={"type": "json_object"},
                max_tokens=1500,
                temperature=0.7,
            )
            result = json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Outreach generation error: {e}")
            result = self._fallback_outreach(business, contact_name, angle)

        result["business_id"] = str(business["id"])
        if contact and contact.get("id"):
            result["contact_id"] = str(contact["id"])

        return result

    def _select_angle(self, score: dict) -> str:
        """Pick angle from the highest scoring dimension."""
        dimension_map = {
            "score_tenant": "tenant",
            "score_owner_user": "owner_user",
            "score_expanding": "expanding",
            "score_relocating": "relocating",
            "score_investor": "investor",
        }
        best = max(dimension_map.keys(), key=lambda k: score.get(k, 0))
        return dimension_map[best]

    def _fallback_outreach(self, business: dict, contact_name: str, angle: str) -> dict:
        name = business.get("business_name", "your business")
        city = business.get("city", "the Twin Cities")
        return {
            "cold_email_subject": f"Commercial real estate options in {city}",
            "cold_email_body": (
                f"I specialize in commercial real estate in the {city} market and work with "
                f"businesses in {business.get('industry', 'your industry')} regularly.\n\n"
                f"I'd love to connect for 10 minutes to share what's moving in the market "
                f"and see if there's anything relevant to {name}.\n\n"
                f"Would you have time for a quick call this week?"
            ),
            "linkedin_message": f"Hi {contact_name}, I work with {business.get('industry', '')} businesses in MN on CRE. Worth a quick connect?",
            "cold_call_opener": f"Hi, this is [Your Name] — I'm a commercial real estate broker in the Twin Cities. I work specifically with {business.get('industry', '')} businesses on space. Is this a decent time for 60 seconds?",
            "voicemail_script": f"Hi {contact_name}, this is [Your Name], commercial real estate broker in Minnesota. I work with {business.get('industry', '')} businesses on space needs. Give me a call at [YOUR NUMBER] when you get a chance.",
            "followup_day3": "Just wanted to make sure my earlier email didn't get lost. Happy to share what's available in your market — takes 10 minutes.",
            "followup_day7": "Still thinking about you. Saw a great [space type] listing in [City] that might be worth a look.",
            "followup_day14": f"I'll stop reaching out after this one — if the timing isn't right, totally understood. Whenever space does come up for {name}, feel free to reach back out.",
            "personalization_notes": f"Fallback outreach for {angle} angle.",
        }
