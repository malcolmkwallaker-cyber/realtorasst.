from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ── Business ──────────────────────────────────────────────────────────────────

class BusinessCreate(BaseModel):
    business_name: str
    source: str
    industry: Optional[str] = None
    industry_raw: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contact_page_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: str = "MN"
    zip: Optional[str] = None
    county: Optional[str] = None
    company_size_estimate: Optional[str] = None
    years_in_business: Optional[int] = None
    mn_sos_filing_date: Optional[str] = None
    mn_sos_id: Optional[str] = None


class BusinessRow(BusinessCreate):
    id: UUID
    scraped_at: datetime
    website_crawled: bool = False
    enriched_at: Optional[datetime] = None
    dedup_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ── Contact ───────────────────────────────────────────────────────────────────

class ContactCreate(BaseModel):
    business_id: UUID
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    title_normalized: Optional[str] = None
    email: Optional[str] = None
    email_confidence: Optional[float] = None
    phone_direct: Optional[str] = None
    linkedin_url: Optional[str] = None
    found_on_page: Optional[str] = None
    found_via: Optional[str] = None
    outreach_status: str = "new"
    notes: Optional[str] = None


class ContactRow(ContactCreate):
    id: UUID
    last_contacted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ── CRE Score ─────────────────────────────────────────────────────────────────

class CREScoreCreate(BaseModel):
    business_id: UUID
    score_tenant: int = Field(ge=0, le=100)
    score_owner_user: int = Field(ge=0, le=100)
    score_expanding: int = Field(ge=0, le=100)
    score_relocating: int = Field(ge=0, le=100)
    score_investor: int = Field(ge=0, le=100)
    score_overall: int = Field(ge=0, le=100)
    reasoning: dict = Field(default_factory=dict)
    signals: dict = Field(default_factory=dict)
    model_version: str = "v1"


class CREScoreRow(CREScoreCreate):
    id: UUID
    scored_at: datetime
    created_at: datetime


# ── Scrape Job ────────────────────────────────────────────────────────────────

class ScrapeJobParams(BaseModel):
    industry: str
    cities: list[str] = [
        "Minneapolis", "Saint Paul", "Bloomington", "Plymouth",
        "Maple Grove", "Duluth", "Rochester", "Eden Prairie",
        "Eagan", "Minnetonka", "Burnsville", "Lakeville"
    ]
    max_results: int = 50


class ScrapeJobRow(BaseModel):
    id: UUID
    job_type: str
    status: str
    params: Optional[dict] = None
    records_found: int = 0
    records_saved: int = 0
    records_failed: int = 0
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime


# ── Outreach ──────────────────────────────────────────────────────────────────

class OutreachGenerateRequest(BaseModel):
    business_id: UUID
    contact_id: Optional[UUID] = None
    angle: str = "auto"  # 'tenant' | 'owner_user' | 'expanding' | 'relocating' | 'investor' | 'auto'


# ── Filters ───────────────────────────────────────────────────────────────────

class LeadFilter(BaseModel):
    industry: Optional[str] = None
    city: Optional[str] = None
    min_score: int = 0
    outreach_status: Optional[str] = None
    limit: int = 100
    offset: int = 0
