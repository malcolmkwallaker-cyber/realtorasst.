import asyncio
import logging
import re
from typing import Optional
from urllib.parse import urljoin, urlparse

from lead_gen.config import settings
from lead_gen.scrapers.base import BaseScraper, USER_AGENT

logger = logging.getLogger(__name__)

CONTACT_PAGE_PATTERNS = [
    "/about", "/about-us", "/about_us", "/aboutus",
    "/team", "/our-team", "/our_team",
    "/leadership", "/management", "/people", "/staff",
    "/contact", "/contact-us", "/contact_us",
    "/who-we-are", "/company", "/meet-the-team",
]


class WebsiteSpider(BaseScraper):
    """
    Visits company websites to find About/Team/Contact pages
    and extract page text for AI enrichment.
    """

    async def scrape(self, params):
        # Not used directly — call crawl_business() instead
        return []

    async def crawl_business(self, business: dict) -> dict:
        """
        Given a business dict with a website URL, crawl relevant pages
        and return extracted page texts and metadata.
        """
        website = business.get("website")
        if not website:
            return {}

        if not self._check_robots(website):
            logger.info(f"robots.txt disallows: {website}")
            return {}

        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=settings.PLAYWRIGHT_HEADLESS)
                context = await browser.new_context(
                    user_agent=USER_AGENT,
                    viewport={"width": 1280, "height": 900},
                )
                result = await self._crawl(context, website, business.get("business_name", ""))
                await browser.close()
                return result
        except ImportError:
            logger.error("playwright not installed")
            return {}
        except Exception as e:
            logger.error(f"Website crawl error {website}: {e}")
            return {}

    async def _crawl(self, context, base_url: str, business_name: str) -> dict:
        page = await context.new_page()
        result = {
            "base_url": base_url,
            "pages_found": [],
            "page_texts": {},
            "emails": [],
            "linkedin_urls": [],
            "contact_page_url": None,
        }

        try:
            # Load homepage
            await page.goto(base_url, timeout=settings.PLAYWRIGHT_TIMEOUT_MS)
            await page.wait_for_load_state("domcontentloaded")

            html = await page.content()
            result["emails"].extend(self._extract_emails(html))
            result["linkedin_urls"].extend(self._extract_linkedin(html))

            # Find internal links matching contact page patterns
            all_links = await page.eval_on_selector_all(
                "a[href]",
                "els => els.map(el => el.href)"
            )
            candidate_pages = self._find_contact_pages(all_links, base_url)

            # Crawl up to 3 candidate pages
            for candidate_url in candidate_pages[:3]:
                await self._polite_delay()
                try:
                    await page.goto(candidate_url, timeout=settings.PLAYWRIGHT_TIMEOUT_MS)
                    await page.wait_for_load_state("domcontentloaded")

                    page_html = await page.content()
                    page_text = self._extract_clean_text(page_html)

                    result["pages_found"].append(candidate_url)
                    result["page_texts"][candidate_url] = page_text
                    result["emails"].extend(self._extract_emails(page_html))
                    result["linkedin_urls"].extend(self._extract_linkedin(page_html))

                    if not result["contact_page_url"] and any(
                        p in candidate_url.lower() for p in ["/contact", "/about", "/team"]
                    ):
                        result["contact_page_url"] = candidate_url

                except Exception as e:
                    logger.debug(f"Error loading {candidate_url}: {e}")

        except Exception as e:
            logger.error(f"Crawl error for {base_url}: {e}")
        finally:
            await page.close()

        # Deduplicate
        result["emails"] = list(set(result["emails"]))
        result["linkedin_urls"] = list(set(result["linkedin_urls"]))

        return result

    def _find_contact_pages(self, links: list[str], base_url: str) -> list[str]:
        base_domain = urlparse(base_url).netloc
        candidates = []
        for link in links:
            try:
                parsed = urlparse(link)
                if parsed.netloc != base_domain:
                    continue
                path_lower = parsed.path.lower().rstrip("/")
                for pattern in CONTACT_PAGE_PATTERNS:
                    if path_lower == pattern or path_lower.endswith(pattern):
                        candidates.append(link)
                        break
            except Exception:
                continue
        return list(dict.fromkeys(candidates))  # dedup preserving order

    def _extract_clean_text(self, html: str, max_chars: int = 8000) -> str:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "meta"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text)
        return text[:max_chars]

    def _extract_emails(self, html: str) -> list[str]:
        emails = re.findall(
            r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}",
            html
        )
        # Filter out image/asset emails and common false positives
        filtered = [
            e for e in emails
            if not any(ext in e.lower() for ext in [".png", ".jpg", ".gif", ".css", ".js"])
            and "example" not in e.lower()
            and "sentry" not in e.lower()
        ]
        return list(set(filtered))

    def _extract_linkedin(self, html: str) -> list[str]:
        urls = re.findall(
            r"https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9\-_/]+",
            html
        )
        return list(set(urls))
