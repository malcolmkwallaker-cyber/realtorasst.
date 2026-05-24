import logging

from lead_gen.config import settings
from lead_gen.db.queries import (
    list_businesses, get_contacts_for_business,
    get_score, get_outreach, log_export
)
from lead_gen.models import LeadFilter
from lead_gen.export.csv_exporter import CSVExporter

logger = logging.getLogger(__name__)

FIELD_MAP = {
    "business_name":   "Business Name",
    "industry":        "Industry",
    "city":            "City",
    "state":           "State",
    "zip":             "ZIP",
    "address":         "Address",
    "website":         "Website",
    "phone":           "Phone",
    "contact_name":    "Decision Maker",
    "contact_title":   "Title",
    "contact_email":   "Email",
    "contact_linkedin":"LinkedIn",
    "score_overall":   "CRE Score",
    "score_tenant":    "Tenant Score",
    "score_owner_user":"Owner-User Score",
    "score_expanding": "Expanding Score",
    "score_relocating":"Relocating Score",
    "score_investor":  "Investor Score",
    "outreach_status": "Status",
    "cold_email_subject": "Email Subject",
    "cold_email_body": "Email Draft",
    "linkedin_message":"LinkedIn Message",
    "cold_call_opener":"Call Opener",
    "notes":           "Notes",
    "source":          "Source",
    "scraped_at":      "Scraped At",
}


class AirtableExporter:
    def _get_table(self):
        from pyairtable import Api
        if not settings.AIRTABLE_API_KEY or not settings.AIRTABLE_BASE_ID:
            raise ValueError("AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in .env")
        api = Api(settings.AIRTABLE_API_KEY)
        return api.table(settings.AIRTABLE_BASE_ID, settings.AIRTABLE_TABLE_NAME)

    async def export(self, filters: LeadFilter) -> dict:
        businesses = list_businesses(filters)
        flattener = CSVExporter()
        airtable_records = []

        for biz in businesses:
            contacts = get_contacts_for_business(biz["id"])
            score = get_score(biz["id"])
            outreach = get_outreach(biz["id"])
            primary_contact = contacts[0] if contacts else {}
            flat = flattener._flatten(biz, primary_contact, score or {}, outreach or {})

            # Convert to Airtable field names, skip empty values
            record_fields = {}
            for csv_key, at_field in FIELD_MAP.items():
                val = flat.get(csv_key)
                if val is not None and val != "":
                    # Airtable number fields need actual numbers
                    if csv_key.startswith("score_"):
                        try:
                            val = int(val)
                        except (ValueError, TypeError):
                            continue
                    record_fields[at_field] = val
            airtable_records.append(record_fields)

        table = self._get_table()

        # Upsert in batches of 10 (Airtable limit)
        total = 0
        for i in range(0, len(airtable_records), 10):
            batch = airtable_records[i:i + 10]
            try:
                table.batch_upsert(
                    batch,
                    key_fields=["Business Name"],
                    replace=False,
                )
                total += len(batch)
            except Exception as e:
                logger.error(f"Airtable batch upsert error: {e}")

        log_export("airtable", total, settings.AIRTABLE_BASE_ID, filters.model_dump())
        logger.info(f"Airtable export: {total} records upserted")
        return {"records_upserted": total}
