from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Existing Anthropic key (for existing features)
    ANTHROPIC_API_KEY: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Google Sheets
    GOOGLE_SERVICE_ACCOUNT_JSON: str = "./google_service_account.json"
    GOOGLE_SHEET_ID: str = ""

    # Airtable
    AIRTABLE_API_KEY: str = ""
    AIRTABLE_BASE_ID: str = ""
    AIRTABLE_TABLE_NAME: str = "CRE Leads"

    # SerpAPI (optional fallback for Google Maps)
    SERPAPI_KEY: str = ""

    # Playwright
    PLAYWRIGHT_HEADLESS: bool = True
    PLAYWRIGHT_TIMEOUT_MS: int = 30000

    # Rate limiting
    SCRAPE_DELAY_SECONDS: float = 2.0
    MAX_CONCURRENT_SCRAPERS: int = 3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
