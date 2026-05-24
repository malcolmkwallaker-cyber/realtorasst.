import logging
import os
from typing import Optional

from lead_gen.config import settings
from lead_gen.db.queries import (
    list_businesses, get_contacts_for_business,
    get_score, get_outreach, log_export
)
from lead_gen.models import LeadFilter
from lead_gen.export.csv_exporter import COLUMNS, CSVExporter

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


class SheetsExporter:
    """
    Exports leads to Google Sheets using a service account.
    The service account JSON key must be granted Editor access to the target sheet.
    """

    def _get_service(self):
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        key_path = settings.GOOGLE_SERVICE_ACCOUNT_JSON
        if not os.path.exists(key_path):
            raise FileNotFoundError(
                f"Google service account JSON not found at: {key_path}\n"
                "Download from GCP Console → IAM → Service Accounts → Keys"
            )
        creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
        return build("sheets", "v4", credentials=creds)

    async def export(self, filters: LeadFilter, sheet_id: Optional[str] = None) -> dict:
        sheet_id = sheet_id or settings.GOOGLE_SHEET_ID
        if not sheet_id:
            raise ValueError("GOOGLE_SHEET_ID not set in .env")

        businesses = list_businesses(filters)
        flattener = CSVExporter()
        rows = []

        for biz in businesses:
            contacts = get_contacts_for_business(biz["id"])
            score = get_score(biz["id"])
            outreach = get_outreach(biz["id"])
            primary_contact = contacts[0] if contacts else {}
            flat = flattener._flatten(biz, primary_contact, score or {}, outreach or {})
            rows.append([str(flat.get(col, "") or "") for col in COLUMNS])

        service = self._get_service()
        sheet = service.spreadsheets()

        sheet.values().clear(
            spreadsheetId=sheet_id,
            range="Sheet1!A:Z"
        ).execute()

        values = [COLUMNS] + rows
        sheet.values().update(
            spreadsheetId=sheet_id,
            range="Sheet1!A1",
            valueInputOption="RAW",
            body={"values": values},
        ).execute()

        # Freeze header row
        sheet.batchUpdate(
            spreadsheetId=sheet_id,
            body={
                "requests": [{
                    "updateSheetProperties": {
                        "properties": {"sheetId": 0, "gridProperties": {"frozenRowCount": 1}},
                        "fields": "gridProperties.frozenRowCount",
                    }
                }]
            },
        ).execute()

        sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}"
        log_export("sheets", len(rows), sheet_url, filters.model_dump())
        logger.info(f"Sheets export: {len(rows)} records → {sheet_url}")
        return {"sheet_url": sheet_url, "records_written": len(rows)}
