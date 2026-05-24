import asyncio
import json
import logging
import re
from typing import Optional

from lead_gen.config import settings
from lead_gen.models import BusinessCreate, ScrapeJobParams
from lead_gen.scrapers.base import BaseScraper, USER_AGENT

logger = logging.getLogger(__name__)


class GoogleMapsScraper(BaseScraper):
    """
    Scrapes Google Maps search results for businesses in Minnesota cities.
    Uses Playwright for browser automation to handle dynamic content.
    Falls back to SerpAPI if SERPAPI_KEY is configured.
    """

    MAPS_BASE = "https://www.google.com/maps/search/"

    async def scrape(self, params: ScrapeJobParams) -> list[BusinessCreate]:
        results: list[BusinessCreate] = []

        if settings.SERPAPI_KEY:
            for city in params.cities:
                city_results = await self._scrape_via_serpapi(params.industry, city, params.max_results)
                results.extend(city_results)
                await self._polite_delay()
        else:
            try:
                from playwright.async_api import async_playwright
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=settings.PLAYWRIGHT_HEADLESS)
                    context = await browser.new_context(
                        user_agent=USER_AGENT,
                        viewport={"width": 1280, "height": 900},
                    )
                    sem = asyncio.Semaphore(settings.MAX_CONCURRENT_SCRAPERS)
                    tasks = [
                        self._scrape_city(context, sem, params.industry, city, params.max_results)
                        for city in params.cities
                    ]
                    city_batches = await asyncio.gather(*tasks, return_exceptions=True)
                    for batch in city_batches:
                        if isinstance(batch, list):
                            results.extend(batch)
                        elif isinstance(batch, Exception):
                            logger.error(f"City scrape error: {batch}")
                    await browser.close()
            except ImportError:
                logger.error("playwright not installed. Run: playwright install chromium")

        logger.info(f"GoogleMaps: found {len(results)} results for '{params.industry}'")
        return results

    async def _scrape_city(self, context, sem, industry: str, city: str, max_results: int) -> list[BusinessCreate]:
        async with sem:
            page = await context.new_page()
            results = []
            try:
                query = f"{industry} in {city} Minnesota"
                url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"
                logger.info(f"Scraping Google Maps: {query}")

                await page.goto(url, timeout=settings.PLAYWRIGHT_TIMEOUT_MS)
                await page.wait_for_selector('div[role="feed"]', timeout=15000)

                # Scroll to load more results
                feed = page.locator('div[role="feed"]')
                prev_count = 0
                for _ in range(10):
                    await feed.evaluate("el => el.scrollBy(0, el.scrollHeight)")
                    await asyncio.sleep(1.5)
                    cards = await page.locator('div[role="feed"] > div[jsaction]').count()
                    if cards >= max_results or cards == prev_count:
                        break
                    prev_count = cards

                cards = await page.locator('div[role="feed"] > div[jsaction]').all()
                for card in cards[:max_results]:
                    business = await self._extract_card(card, city, industry)
                    if business:
                        results.append(business)
                    await self._polite_delay()

            except Exception as e:
                logger.error(f"Error scraping {city}: {e}")
            finally:
                await page.close()

            return results

    async def _extract_card(self, card, city: str, industry: str) -> Optional[BusinessCreate]:
        try:
            # Click the card to load details
            await card.click()
            await asyncio.sleep(1.5)

            page = card.page

            # Business name
            name_el = page.locator('h1.fontHeadlineLarge, h1[class*="fontHeadline"]').first
            name = await name_el.text_content() if await name_el.count() > 0 else None
            if not name:
                return None

            # Address
            address_el = page.locator('[data-item-id="address"] .fontBodyMedium').first
            address = await address_el.text_content() if await address_el.count() > 0 else None

            # Phone
            phone_el = page.locator('[data-item-id^="phone"] .fontBodyMedium').first
            phone = await phone_el.text_content() if await phone_el.count() > 0 else None

            # Website
            website_el = page.locator('a[data-item-id="authority"]').first
            website = await website_el.get_attribute("href") if await website_el.count() > 0 else None

            # Category
            category_el = page.locator('button[jsaction*="category"]').first
            category = await category_el.text_content() if await category_el.count() > 0 else industry

            # Parse city/state/zip from address
            parsed_city, parsed_zip = self._parse_address(address or "", city)

            return BusinessCreate(
                business_name=name.strip(),
                source="google_maps",
                industry=self._normalize_industry(category or industry),
                industry_raw=category,
                website=self._normalize_url(website),
                phone=self._normalize_phone(phone or ""),
                address=address,
                city=parsed_city or city,
                state="MN",
                zip=parsed_zip,
            )
        except Exception as e:
            logger.debug(f"Card extraction error: {e}")
            return None

    def _parse_address(self, address: str, fallback_city: str) -> tuple[str, str]:
        mn_pattern = re.search(r"([A-Za-z\s]+),\s*MN\s+(\d{5})", address)
        if mn_pattern:
            return mn_pattern.group(1).strip(), mn_pattern.group(2)
        return fallback_city, ""

    async def _scrape_via_serpapi(self, industry: str, city: str, max_results: int) -> list[BusinessCreate]:
        """Fallback: use SerpAPI Google Maps endpoint."""
        import httpx
        results = []
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    "https://serpapi.com/search",
                    params={
                        "engine": "google_maps",
                        "q": f"{industry} in {city} Minnesota",
                        "type": "search",
                        "api_key": settings.SERPAPI_KEY,
                        "num": min(max_results, 20),
                    }
                )
                data = resp.json()
                for place in data.get("local_results", [])[:max_results]:
                    results.append(BusinessCreate(
                        business_name=place.get("title", ""),
                        source="google_maps_serpapi",
                        industry=self._normalize_industry(place.get("type", industry)),
                        industry_raw=place.get("type"),
                        website=self._normalize_url(place.get("website", "")),
                        phone=self._normalize_phone(place.get("phone", "")),
                        address=place.get("address", ""),
                        city=city,
                        state="MN",
                    ))
        except Exception as e:
            logger.error(f"SerpAPI error: {e}")
        return results
