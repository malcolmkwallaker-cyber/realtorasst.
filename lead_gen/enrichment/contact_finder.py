import logging
from uuid import UUID

from lead_gen.enrichment.ai_enricher import AIEnricher
from lead_gen.enrichment.email_finder import EmailFinder
from lead_gen.models import ContactCreate
from lead_gen.scrapers.website import WebsiteSpider

logger = logging.getLogger(__name__)


class ContactFinder:
    """
    Orchestrates website crawling + AI extraction to find contacts for a business.
    Returns a list of ContactCreate objects ready to save.
    """

    def __init__(self):
        self.spider = WebsiteSpider()
        self.enricher = AIEnricher()
        self.email_finder = EmailFinder()

    async def find_contacts(self, business: dict) -> tuple[list[ContactCreate], dict]:
        """
        Returns (contacts, signals) where signals is the business summary dict
        from AI enrichment — useful for CRE scoring.
        """
        business_id = UUID(str(business["id"]))
        business_name = business.get("business_name", "")
        contacts: list[ContactCreate] = []
        signals: dict = {}

        crawl_data = await self.spider.crawl_business(business)
        if not crawl_data:
            return contacts, signals

        # Collect all page texts
        all_text = " ".join(crawl_data.get("page_texts", {}).values())
        found_emails = crawl_data.get("emails", [])
        found_linkedins = crawl_data.get("linkedin_urls", [])
        contact_page_url = crawl_data.get("contact_page_url")

        # AI contact extraction from page text
        raw_contacts = await self.enricher.extract_contacts(all_text, business_name)

        # AI business signals extraction
        if all_text:
            signals = await self.enricher.summarize_business(all_text, business_name)

        # Build ContactCreate objects
        domain = self._get_domain(business.get("website", ""))
        for rc in raw_contacts:
            full_name = rc.get("full_name") or ""
            title = rc.get("title") or ""

            # Infer email if not found directly
            email = rc.get("email")
            email_confidence = 0.9 if email else None

            if not email and full_name and domain:
                inferred, conf = self.email_finder.infer_email(
                    full_name, domain, found_emails
                )
                if inferred:
                    email = inferred
                    email_confidence = conf

            # Match linkedin from page crawl
            linkedin = rc.get("linkedin_url")
            if not linkedin and full_name:
                linkedin = self._match_linkedin(full_name, found_linkedins)

            contact = ContactCreate(
                business_id=business_id,
                full_name=full_name or None,
                first_name=full_name.split()[0] if full_name else None,
                last_name=full_name.split()[-1] if full_name and len(full_name.split()) > 1 else None,
                title=title or None,
                title_normalized=self.enricher.normalize_title(title) if title else None,
                email=email,
                email_confidence=email_confidence,
                phone_direct=rc.get("phone"),
                linkedin_url=linkedin,
                found_on_page=contact_page_url,
                found_via="website_team",
            )
            contacts.append(contact)

        # If no structured contacts found but emails exist, create minimal records
        if not contacts and found_emails:
            for email in found_emails[:3]:
                contacts.append(ContactCreate(
                    business_id=business_id,
                    email=email,
                    email_confidence=0.7,
                    found_on_page=contact_page_url,
                    found_via="website_email_scrape",
                ))

        logger.info(f"Found {len(contacts)} contacts for '{business_name}'")
        return contacts, signals

    def _get_domain(self, website: str) -> str:
        from urllib.parse import urlparse
        try:
            return urlparse(website).netloc.lstrip("www.")
        except Exception:
            return ""

    def _match_linkedin(self, full_name: str, linkedin_urls: list[str]) -> str | None:
        """Try to match a LinkedIn URL to a person by name slug."""
        if not full_name or not linkedin_urls:
            return None
        name_slug = full_name.lower().replace(" ", "-").replace(".", "")
        for url in linkedin_urls:
            url_lower = url.lower()
            first = full_name.split()[0].lower()
            last = full_name.split()[-1].lower() if len(full_name.split()) > 1 else ""
            if first in url_lower and last and last in url_lower:
                return url
            if name_slug in url_lower:
                return url
        return None
