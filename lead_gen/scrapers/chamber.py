import asyncio
import logging
import re
from typing import Optional

from lead_gen.config import settings
from lead_gen.models import BusinessCreate, ScrapeJobParams
from lead_gen.scrapers.base import BaseScraper, USER_AGENT

logger = logging.getLogger(__name__)


CHAMBER_DIRECTORIES = {
    "minneapolis": {
        "url": "https://www.minneapolischamber.org/member-directory/",
        "city": "Minneapolis",
    },
    "saint_paul": {
        "url": "https://www.saintpaulchamber.com/business-directory/",
        "city": "Saint Paul",
    },
}


class ChamberScraper(BaseScraper):
    """
    Scrapes publicly accessible Minnesota Chamber of Commerce member directories.
    All data is voluntarily published by member businesses.
    """

    async def scrape(self, params: ScrapeJobParams) -> list[BusinessCreate]:
        results: list[BusinessCreate] = []
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=settings.PLAYWRIGHT_HEADLESS)
                context = await browser.new_context(
                    user_agent=USER_AGENT,
                    viewport={"width": 1280, "height": 900},
                )

                for chamber_key, chamber_info in CHAMBER_DIRECTORIES.items():
                    if not self._check_robots(chamber_info["url"]):
                        logger.info(f"Skipping {chamber_key} — robots.txt disallows")
                        continue

                    chamber_results = await self._scrape_directory(
                        context,
                        chamber_info["url"],
                        chamber_info["city"],
                        params.industry,
                        params.max_results,
                    )
                    results.extend(chamber_results)
                    await self._polite_delay()

                await browser.close()
        except ImportError:
            logger.error("playwright not installed. Run: playwright install chromium")
        except Exception as e:
            logger.error(f"Chamber scrape error: {e}")

        logger.info(f"Chamber: found {len(results)} results")
        return results

    async def _scrape_directory(
        self, context, url: str, city: str, industry_filter: str, max_results: int
    ) -> list[BusinessCreate]:
        results = []
        page = await context.new_page()
        try:
            logger.info(f"Scraping chamber directory: {url}")
            await page.goto(url, timeout=settings.PLAYWRIGHT_TIMEOUT_MS)
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            html = await page.content()
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "html.parser")

            # Generic member listing patterns used by most chamber directory plugins
            member_containers = (
                soup.find_all("div", class_=re.compile(r"member|listing|directory|company", re.I))
                or soup.find_all("li", class_=re.compile(r"member|listing|directory", re.I))
                or soup.find_all("article")
            )

            if not member_containers:
                # Fallback: look for any card-like divs with business info
                member_containers = soup.find_all("div", class_=re.compile(r"card|result|item", re.I))

            logger.info(f"Found {len(member_containers)} potential member elements at {url}")

            for container in member_containers[:max_results]:
                business = self._parse_member_card(container, city, industry_filter)
                if business:
                    results.append(business)

        except Exception as e:
            logger.error(f"Chamber directory scrape error {url}: {e}")
        finally:
            await page.close()

        return results

    def _parse_member_card(self, el, city: str, industry: str) -> Optional[BusinessCreate]:
        from bs4 import BeautifulSoup, Tag
        try:
            text = el.get_text(separator=" ", strip=True)
            if len(text) < 10:
                return None

            # Business name: first link or heading
            name = None
            for tag in ["h2", "h3", "h4", "strong", "a"]:
                name_el = el.find(tag)
                if name_el:
                    name = name_el.get_text(strip=True)
                    if len(name) > 3:
                        break

            if not name:
                return None

            # Phone
            phone_match = re.search(r"[\(]?\d{3}[\)\-\.\s]\s?\d{3}[\-\.\s]\d{4}", text)
            phone = phone_match.group(0) if phone_match else None

            # Website
            website = None
            for a in el.find_all("a", href=True):
                href = a["href"]
                if href.startswith("http") and "chamber" not in href.lower():
                    website = href
                    break

            # Email
            email_match = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", text)
            email = email_match.group(0) if email_match else None

            return BusinessCreate(
                business_name=name.strip(),
                source="chamber",
                industry=self._normalize_industry(industry),
                industry_raw=industry,
                website=self._normalize_url(website or ""),
                phone=self._normalize_phone(phone or ""),
                email=email,
                city=city,
                state="MN",
            )
        except Exception:
            return None
