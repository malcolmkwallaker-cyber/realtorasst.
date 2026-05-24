import csv
import io
import logging
from typing import Optional

from lead_gen.db.queries import (
    list_businesses, get_contacts_for_business,
    get_score, get_outreach, log_export
)
from lead_gen.models import LeadFilter

logger = logging.getLogger(__name__)

COLUMNS = [
    "business_name", "industry", "city", "state", "zip", "address",
    "website", "phone",
    "contact_name", "contact_title", "contact_email", "contact_linkedin",
    "score_overall", "score_tenant", "score_owner_user",
    "score_expanding", "score_relocating", "score_investor",
    "outreach_status",
    "cold_email_subject", "cold_email_body",
    "linkedin_message", "cold_call_opener",
    "notes", "source", "scraped_at",
]


class CSVExporter:
    async def export(self, filters: LeadFilter) -> bytes:
        businesses = list_businesses(filters)
        rows = []

        for biz in businesses:
            contacts = get_contacts_for_business(biz["id"])
            score = get_score(biz["id"])
            outreach = get_outreach(biz["id"])

            primary_contact = contacts[0] if contacts else {}
            row = self._flatten(biz, primary_contact, score or {}, outreach or {})
            rows.append(row)

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

        csv_bytes = output.getvalue().encode("utf-8")

        log_export("csv", len(rows), "download", filters.model_dump())
        logger.info(f"CSV export: {len(rows)} records")
        return csv_bytes

    def _flatten(self, biz: dict, contact: dict, score: dict, outreach: dict) -> dict:
        return {
            "business_name": biz.get("business_name", ""),
            "industry": biz.get("industry", ""),
            "city": biz.get("city", ""),
            "state": biz.get("state", "MN"),
            "zip": biz.get("zip", ""),
            "address": biz.get("address", ""),
            "website": biz.get("website", ""),
            "phone": biz.get("phone", ""),
            "contact_name": contact.get("full_name", ""),
            "contact_title": contact.get("title_normalized") or contact.get("title", ""),
            "contact_email": contact.get("email", ""),
            "contact_linkedin": contact.get("linkedin_url", ""),
            "score_overall": score.get("score_overall", ""),
            "score_tenant": score.get("score_tenant", ""),
            "score_owner_user": score.get("score_owner_user", ""),
            "score_expanding": score.get("score_expanding", ""),
            "score_relocating": score.get("score_relocating", ""),
            "score_investor": score.get("score_investor", ""),
            "outreach_status": contact.get("outreach_status", "new"),
            "cold_email_subject": outreach.get("cold_email_subject", ""),
            "cold_email_body": outreach.get("cold_email_body", ""),
            "linkedin_message": outreach.get("linkedin_message", ""),
            "cold_call_opener": outreach.get("cold_call_opener", ""),
            "notes": contact.get("notes", ""),
            "source": biz.get("source", ""),
            "scraped_at": str(biz.get("scraped_at", "")),
        }
