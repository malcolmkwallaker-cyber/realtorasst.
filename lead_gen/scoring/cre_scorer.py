import json
import logging
from typing import Optional

from openai import AsyncOpenAI

from lead_gen.config import settings
from lead_gen.models import CREScoreCreate
from uuid import UUID

logger = logging.getLogger(__name__)

SCORING_SYSTEM = """You are a commercial real estate analyst specializing in Minnesota tenant and buyer lead scoring.
You score businesses on their likelihood to engage in CRE activity in the next 12-18 months.
You are precise, data-driven, and base scores strictly on available evidence."""

SCORING_PROMPT = """Score this Minnesota business for commercial real estate intent.

Business Profile:
{profile}

Score each dimension 0-100:
- score_tenant: Likelihood to LEASE commercial/industrial/office space
- score_owner_user: Likelihood to BUY property for their own business use
- score_expanding: Likelihood to expand to new or larger location
- score_relocating: Likelihood to relocate their current space
- score_investor: Likelihood to invest in CRE as investment (buy to hold/lease)

Scoring guidelines:
- Manufacturing/Industrial/Logistics/Warehousing → high tenant (70-90) or owner-user (50-80)
- Medical/Dental → high tenant (75-90), specific build-out needs
- Contractors/HVAC/Roofing → high industrial/flex tenant (60-80)
- Law/Accounting/Insurance → stable office tenant (55-75)
- Restaurant/Franchise → high tenant/expanding (65-85)
- Property Management/Developers/Investors → high investor (70-95)
- Multi-location businesses → high expanding (75-90)
- Companies 5-15 years old → prime expansion window (boost expanding +15)
- Company size 11-200 employees → most likely to lease/buy (boost all +10)
- Signals of growth/hiring/new services → boost expanding/relocating +10-20
- Owns property already → lower tenant, higher owner-user

Return ONLY valid JSON:
{{
  "score_tenant": integer,
  "score_owner_user": integer,
  "score_expanding": integer,
  "score_relocating": integer,
  "score_investor": integer,
  "reasoning": {{
    "tenant": "brief reason",
    "owner_user": "brief reason",
    "expanding": "brief reason",
    "relocating": "brief reason",
    "investor": "brief reason"
  }},
  "signals": {{
    "multiple_locations": boolean,
    "growing_industry": boolean,
    "owns_vs_leases": "unknown" | "likely_owns" | "likely_leases",
    "company_age_years": integer or null,
    "employee_count_estimate": string or null
  }}
}}"""


class CREScorer:
    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            if not settings.OPENAI_API_KEY:
                raise RuntimeError("OPENAI_API_KEY not set in .env")
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client

    async def score_business(
        self,
        business: dict,
        contacts: list[dict],
        website_signals: dict,
    ) -> CREScoreCreate:
        profile = self._build_profile(business, contacts, website_signals)
        client = self._get_client()

        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SCORING_SYSTEM},
                    {"role": "user", "content": SCORING_PROMPT.format(profile=profile)},
                ],
                response_format={"type": "json_object"},
                max_tokens=800,
                temperature=0.1,
            )
            data = json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Scoring error for {business.get('business_name')}: {e}")
            data = self._default_scores()

        # Clamp all scores to 0-100
        for key in ["score_tenant", "score_owner_user", "score_expanding", "score_relocating", "score_investor"]:
            data[key] = max(0, min(100, int(data.get(key, 40))))

        overall = self._compute_overall(data)

        return CREScoreCreate(
            business_id=UUID(str(business["id"])),
            score_tenant=data["score_tenant"],
            score_owner_user=data["score_owner_user"],
            score_expanding=data["score_expanding"],
            score_relocating=data["score_relocating"],
            score_investor=data["score_investor"],
            score_overall=overall,
            reasoning=data.get("reasoning", {}),
            signals=data.get("signals", {}),
        )

    def _compute_overall(self, data: dict) -> int:
        """Weighted composite score."""
        score = (
            data["score_tenant"] * 0.35
            + data["score_expanding"] * 0.25
            + data["score_owner_user"] * 0.20
            + data["score_relocating"] * 0.15
            + data["score_investor"] * 0.05
        )
        return max(0, min(100, int(score)))

    def _build_profile(self, business: dict, contacts: list[dict], signals: dict) -> str:
        lines = [
            f"Business Name: {business.get('business_name', 'Unknown')}",
            f"Industry: {business.get('industry', 'Unknown')}",
            f"City: {business.get('city', 'Unknown')}, MN",
            f"Source: {business.get('source', 'unknown')}",
        ]
        if business.get("years_in_business"):
            lines.append(f"Years in Business: {business['years_in_business']}")
        if business.get("company_size_estimate"):
            lines.append(f"Company Size: {business['company_size_estimate']} employees")
        if business.get("website"):
            lines.append(f"Has Website: Yes")

        if contacts:
            titles = [c.get("title_normalized") or c.get("title") for c in contacts if c.get("title")]
            if titles:
                lines.append(f"Decision Makers Found: {', '.join(titles[:3])}")

        if signals:
            if signals.get("multiple_locations"):
                lines.append("Multiple Locations: Yes")
            if signals.get("recent_expansion_signals"):
                lines.append("Recent Expansion Signals: Yes")
            if signals.get("owns_property_signals"):
                lines.append("Property Ownership Signals: Yes")
            if signals.get("description"):
                lines.append(f"Business Description: {signals['description']}")
            if signals.get("company_size_estimate"):
                lines.append(f"AI Size Estimate: {signals['company_size_estimate']}")

        return "\n".join(lines)

    def _default_scores(self) -> dict:
        return {
            "score_tenant": 40,
            "score_owner_user": 30,
            "score_expanding": 35,
            "score_relocating": 25,
            "score_investor": 15,
            "reasoning": {},
            "signals": {},
        }
