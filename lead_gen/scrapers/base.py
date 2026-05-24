import asyncio
import logging
from abc import ABC, abstractmethod
from urllib import robotparser
from urllib.parse import urlparse

import httpx

from lead_gen.config import settings
from lead_gen.models import BusinessCreate, ScrapeJobParams

USER_AGENT = "Mozilla/5.0 (CRE Research Tool — contact@creresearch.com) AppleWebKit/537.36"


class BaseScraper(ABC):
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self._robots_cache: dict[str, robotparser.RobotFileParser] = {}

    @abstractmethod
    async def scrape(self, params: ScrapeJobParams) -> list[BusinessCreate]:
        ...

    async def _polite_delay(self):
        await asyncio.sleep(settings.SCRAPE_DELAY_SECONDS)

    def _check_robots(self, url: str) -> bool:
        """Return True if scraping is allowed for this URL."""
        try:
            parsed = urlparse(url)
            base = f"{parsed.scheme}://{parsed.netloc}"
            if base not in self._robots_cache:
                rp = robotparser.RobotFileParser()
                rp.set_url(f"{base}/robots.txt")
                rp.read()
                self._robots_cache[base] = rp
            allowed = self._robots_cache[base].can_fetch(USER_AGENT, url)
            if not allowed:
                self.logger.warning(f"robots.txt disallows scraping: {url}")
            return allowed
        except Exception:
            return True  # allow if robots.txt unreachable

    def _normalize_phone(self, phone: str) -> str:
        import re
        digits = re.sub(r"\D", "", phone or "")
        if len(digits) == 10:
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        if len(digits) == 11 and digits[0] == "1":
            return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        return phone

    def _normalize_url(self, url: str) -> str:
        if not url:
            return url
        if not url.startswith(("http://", "https://")):
            return f"https://{url}"
        return url

    def _normalize_industry(self, raw: str) -> str:
        """Map raw scraped category to a normalized industry tag."""
        if not raw:
            return "Other"
        raw_lower = raw.lower()
        mapping = {
            "roofing": "Roofing",
            "hvac": "HVAC",
            "heating": "HVAC",
            "air conditioning": "HVAC",
            "plumbing": "Contractors",
            "contractor": "Contractors",
            "construction": "Construction",
            "manufacturer": "Manufacturing",
            "manufacturing": "Manufacturing",
            "warehouse": "Warehousing",
            "warehousing": "Warehousing",
            "logistics": "Logistics",
            "freight": "Logistics",
            "trucking": "Logistics",
            "medical": "Medical",
            "clinic": "Medical",
            "dental": "Dental",
            "dentist": "Dental",
            "law": "Law Firms",
            "attorney": "Law Firms",
            "legal": "Law Firms",
            "accounting": "Accounting Firms",
            "cpa": "Accounting Firms",
            "insurance": "Insurance Agencies",
            "restaurant": "Restaurant Groups",
            "food": "Restaurant Groups",
            "franchise": "Franchise Operators",
            "retail": "Retail",
            "hotel": "Hospitality",
            "hospitality": "Hospitality",
            "storage": "Self Storage",
            "property management": "Property Management",
            "real estate": "Developers",
            "developer": "Developers",
            "industrial": "Industrial",
        }
        for key, value in mapping.items():
            if key in raw_lower:
                return value
        return raw.title()
