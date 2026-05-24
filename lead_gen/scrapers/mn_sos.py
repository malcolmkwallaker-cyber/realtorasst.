import asyncio
import logging
import re
from typing import Optional

from lead_gen.config import settings
from lead_gen.models import BusinessCreate, ScrapeJobParams
from lead_gen.scrapers.base import BaseScraper, USER_AGENT

logger = logging.getLogger(__name__)

MN_SOS_SEARCH_URL = "https://mblsportal.sos.state.mn.us/Business/Search"


class MNSOSScraper(BaseScraper):
    """
    Scrapes the Minnesota Secretary of State public business search portal.
    Government database — no robots.txt restriction, fully public.
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
                page = await context.new_page()

                businesses = await self._search_businesses(page, params.industry, params.max_results)
                results.extend(businesses)

                await browser.close()
        except ImportError:
            logger.error("playwright not installed. Run: playwright install chromium")
        except Exception as e:
            logger.error(f"MN SOS scrape error: {e}")

        logger.info(f"MN SOS: found {len(results)} results for '{params.industry}'")
        return results

    async def _search_businesses(self, page, keyword: str, max_results: int) -> list[BusinessCreate]:
        results = []
        try:
            await page.goto(MN_SOS_SEARCH_URL, timeout=settings.PLAYWRIGHT_TIMEOUT_MS)
            await page.wait_for_load_state("networkidle")

            # Fill search form
            name_input = page.locator('input[name="BusinessName"], #BusinessName')
            if await name_input.count() > 0:
                await name_input.fill(keyword)

            # Set status to Active if dropdown exists
            status_select = page.locator('select[name="Status"], #Status')
            if await status_select.count() > 0:
                await status_select.select_option("Active")

            # Submit search
            submit_btn = page.locator('input[type="submit"], button[type="submit"]').first
            await submit_btn.click()
            await page.wait_for_load_state("networkidle")
            await asyncio.sleep(2)

            # Parse results table
            rows = await page.locator("table tbody tr").all()
            logger.info(f"MN SOS: {len(rows)} rows found for '{keyword}'")

            detail_urls = []
            for row in rows[:max_results]:
                cells = await row.locator("td").all()
                if len(cells) < 2:
                    continue
                link = row.locator("a").first
                href = await link.get_attribute("href") if await link.count() > 0 else None
                if href:
                    if not href.startswith("http"):
                        href = f"https://mblsportal.sos.state.mn.us{href}"
                    detail_urls.append(href)

            # Visit each detail page for full data
            for url in detail_urls[:max_results]:
                await self._polite_delay()
                detail = await self._parse_detail_page(page, url)
                if detail and detail.get("business_name"):
                    results.append(BusinessCreate(
                        business_name=detail["business_name"],
                        source="mn_sos",
                        industry=self._normalize_industry(keyword),
                        industry_raw=keyword,
                        address=detail.get("address"),
                        city=detail.get("city"),
                        state="MN",
                        zip=detail.get("zip"),
                        mn_sos_id=detail.get("sos_id"),
                        mn_sos_filing_date=detail.get("filing_date"),
                    ))

        except Exception as e:
            logger.error(f"MN SOS search error: {e}")

        return results

    async def _parse_detail_page(self, page, url: str) -> Optional[dict]:
        try:
            await page.goto(url, timeout=settings.PLAYWRIGHT_TIMEOUT_MS)
            await page.wait_for_load_state("networkidle")

            content = await page.content()
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, "html.parser")

            data = {}

            # Extract entity name (usually in h1 or main heading)
            h1 = soup.find("h1")
            if h1:
                data["business_name"] = h1.get_text(strip=True)

            # Extract from definition lists or table rows
            for label_el in soup.find_all(["dt", "th", "td", "label"]):
                label_text = label_el.get_text(strip=True).lower()
                value_el = label_el.find_next_sibling(["dd", "td"])
                if not value_el:
                    continue
                value = value_el.get_text(strip=True)

                if "business name" in label_text or "entity name" in label_text:
                    data["business_name"] = value
                elif "office address" in label_text or "principal address" in label_text:
                    parts = value.split(",")
                    if len(parts) >= 2:
                        data["address"] = parts[0].strip()
                        city_state_zip = parts[-1].strip() if len(parts) > 1 else ""
                        m = re.search(r"([A-Za-z\s]+)\s+MN\s+(\d{5})", city_state_zip)
                        if m:
                            data["city"] = m.group(1).strip()
                            data["zip"] = m.group(2)
                elif "date filed" in label_text or "filing date" in label_text or "date formed" in label_text:
                    data["filing_date"] = value
                elif "file number" in label_text or "entity id" in label_text:
                    data["sos_id"] = value

            # Try to get SOS ID from URL
            url_match = re.search(r"/(\d+)/?$", url)
            if url_match and not data.get("sos_id"):
                data["sos_id"] = url_match.group(1)

            return data
        except Exception as e:
            logger.debug(f"Detail page parse error {url}: {e}")
            return None
