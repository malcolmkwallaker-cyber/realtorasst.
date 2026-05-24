import hashlib
import logging
from uuid import UUID
from typing import Optional

from lead_gen.db.client import get_supabase
from lead_gen.models import (
    BusinessCreate, CREScoreCreate, ContactCreate,
    LeadFilter, ScrapeJobParams
)

logger = logging.getLogger(__name__)


def _dedup_key(business_name: str, city: Optional[str], zip_code: Optional[str]) -> str:
    raw = f"{business_name.lower().strip()}{(city or '').lower().strip()}{zip_code or ''}"
    return hashlib.md5(raw.encode()).hexdigest()


# ── Businesses ────────────────────────────────────────────────────────────────

def upsert_business(data: BusinessCreate) -> dict:
    db = get_supabase()
    row = data.model_dump()
    row["dedup_key"] = _dedup_key(data.business_name, data.city, data.zip)

    result = (
        db.table("businesses")
        .upsert(row, on_conflict="dedup_key")
        .execute()
    )
    return result.data[0] if result.data else {}


def get_business(business_id: UUID) -> Optional[dict]:
    db = get_supabase()
    result = db.table("businesses").select("*").eq("id", str(business_id)).single().execute()
    return result.data


def list_businesses(filters: LeadFilter) -> list[dict]:
    db = get_supabase()
    query = db.table("businesses").select("*")

    if filters.industry:
        query = query.ilike("industry", f"%{filters.industry}%")
    if filters.city:
        query = query.ilike("city", f"%{filters.city}%")

    result = query.range(filters.offset, filters.offset + filters.limit - 1).execute()
    return result.data or []


def list_businesses_unenriched(limit: int = 20) -> list[dict]:
    db = get_supabase()
    result = (
        db.table("businesses")
        .select("*")
        .eq("website_crawled", False)
        .not_.is_("website", "null")
        .limit(limit)
        .execute()
    )
    return result.data or []


def list_businesses_unscored(business_ids: Optional[list[UUID]] = None) -> list[dict]:
    db = get_supabase()

    scored = db.table("cre_scores").select("business_id").execute()
    scored_ids = {r["business_id"] for r in (scored.data or [])}

    query = db.table("businesses").select("*")
    if business_ids:
        query = query.in_("id", [str(bid) for bid in business_ids])

    all_businesses = query.execute().data or []
    return [b for b in all_businesses if b["id"] not in scored_ids]


def mark_website_crawled(business_id: UUID) -> None:
    db = get_supabase()
    from datetime import datetime, timezone
    db.table("businesses").update({
        "website_crawled": True,
        "enriched_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", str(business_id)).execute()


# ── Contacts ──────────────────────────────────────────────────────────────────

def upsert_contact(data: ContactCreate) -> dict:
    db = get_supabase()
    row = data.model_dump()
    row["business_id"] = str(row["business_id"])

    existing = (
        db.table("contacts")
        .select("id")
        .eq("business_id", str(data.business_id))
        .eq("full_name", data.full_name or "")
        .execute()
    )
    if existing.data:
        result = (
            db.table("contacts")
            .update(row)
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = db.table("contacts").insert(row).execute()

    return result.data[0] if result.data else {}


def get_contacts_for_business(business_id: UUID) -> list[dict]:
    db = get_supabase()
    result = (
        db.table("contacts")
        .select("*")
        .eq("business_id", str(business_id))
        .execute()
    )
    return result.data or []


def update_contact_status(contact_id: UUID, status: str, notes: Optional[str] = None) -> None:
    db = get_supabase()
    update = {"outreach_status": status}
    if notes is not None:
        update["notes"] = notes
    db.table("contacts").update(update).eq("id", str(contact_id)).execute()


# ── CRE Scores ────────────────────────────────────────────────────────────────

def upsert_score(data: CREScoreCreate) -> dict:
    db = get_supabase()
    row = data.model_dump()
    row["business_id"] = str(row["business_id"])

    existing = (
        db.table("cre_scores")
        .select("id")
        .eq("business_id", str(data.business_id))
        .execute()
    )
    if existing.data:
        result = (
            db.table("cre_scores")
            .update(row)
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = db.table("cre_scores").insert(row).execute()

    return result.data[0] if result.data else {}


def get_score(business_id: UUID) -> Optional[dict]:
    db = get_supabase()
    result = (
        db.table("cre_scores")
        .select("*")
        .eq("business_id", str(business_id))
        .order("scored_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# ── Scrape Jobs ───────────────────────────────────────────────────────────────

def create_scrape_job(job_type: str, params: dict) -> dict:
    db = get_supabase()
    result = db.table("scrape_jobs").insert({
        "job_type": job_type,
        "status": "pending",
        "params": params,
    }).execute()
    return result.data[0] if result.data else {}


def update_scrape_job(job_id: str, **kwargs) -> None:
    db = get_supabase()
    db.table("scrape_jobs").update(kwargs).eq("id", job_id).execute()


def list_scrape_jobs(limit: int = 20) -> list[dict]:
    db = get_supabase()
    result = (
        db.table("scrape_jobs")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def get_scrape_job(job_id: str) -> Optional[dict]:
    db = get_supabase()
    result = db.table("scrape_jobs").select("*").eq("id", job_id).single().execute()
    return result.data


# ── Outreach ──────────────────────────────────────────────────────────────────

def save_outreach(data: dict) -> dict:
    db = get_supabase()
    data = {k: (str(v) if isinstance(v, UUID) else v) for k, v in data.items()}

    existing = (
        db.table("outreach_templates")
        .select("id")
        .eq("business_id", data["business_id"])
        .execute()
    )
    if existing.data:
        result = (
            db.table("outreach_templates")
            .update(data)
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = db.table("outreach_templates").insert(data).execute()

    return result.data[0] if result.data else {}


def get_outreach(business_id: UUID) -> Optional[dict]:
    db = get_supabase()
    result = (
        db.table("outreach_templates")
        .select("*")
        .eq("business_id", str(business_id))
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# ── Export Logs ───────────────────────────────────────────────────────────────

def log_export(export_type: str, count: int, destination: str, filters: dict) -> None:
    db = get_supabase()
    db.table("export_logs").insert({
        "export_type": export_type,
        "record_count": count,
        "destination": destination,
        "filters_applied": filters,
    }).execute()


# ── Dashboard Stats ───────────────────────────────────────────────────────────

def get_summary_stats() -> dict:
    db = get_supabase()

    total = db.table("businesses").select("id", count="exact").execute()
    enriched = db.table("businesses").select("id", count="exact").eq("website_crawled", True).execute()
    scored = db.table("cre_scores").select("id", count="exact").execute()
    contacted = (
        db.table("contacts")
        .select("id", count="exact")
        .neq("outreach_status", "new")
        .execute()
    )

    by_industry = db.rpc("count_by_industry", {}).execute()
    by_city = db.rpc("count_by_city", {}).execute()
    by_status = db.rpc("count_by_status", {}).execute()

    top_scored = (
        db.table("cre_scores")
        .select("business_id, score_overall, businesses(business_name, city, industry)")
        .order("score_overall", desc=True)
        .limit(10)
        .execute()
    )

    return {
        "total_leads": total.count or 0,
        "enriched": enriched.count or 0,
        "scored": scored.count or 0,
        "contacted": contacted.count or 0,
        "top_scored": top_scored.data or [],
    }
