import asyncio
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import StreamingResponse
import io

from lead_gen.db.queries import (
    upsert_business, upsert_contact, upsert_score, save_outreach,
    list_businesses, get_business, get_contacts_for_business,
    get_score, get_outreach,
    create_scrape_job, update_scrape_job, list_scrape_jobs, get_scrape_job,
    list_businesses_unenriched, list_businesses_unscored,
    mark_website_crawled, update_contact_status,
    get_summary_stats,
)
from lead_gen.models import (
    LeadFilter, ScrapeJobParams, OutreachGenerateRequest,
)
from lead_gen.enrichment.contact_finder import ContactFinder
from lead_gen.scoring.cre_scorer import CREScorer
from lead_gen.outreach.generator import OutreachGenerator
from lead_gen.export.csv_exporter import CSVExporter
from lead_gen.export.sheets_exporter import SheetsExporter
from lead_gen.export.airtable_exporter import AirtableExporter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/leads", tags=["leads"])


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats():
    try:
        return get_summary_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Leads list ────────────────────────────────────────────────────────────────

@router.get("")
async def list_leads(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_score: int = 0,
    outreach_status: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    filters = LeadFilter(
        industry=industry,
        city=city,
        min_score=min_score,
        outreach_status=outreach_status,
        limit=limit,
        offset=offset,
    )
    businesses = list_businesses(filters)
    result = []
    for biz in businesses:
        contacts = get_contacts_for_business(biz["id"])
        score = get_score(biz["id"])
        outreach = get_outreach(biz["id"])
        result.append({
            "business": biz,
            "contacts": contacts,
            "score": score,
            "outreach": outreach,
        })
    return {"leads": result, "total": len(result)}


@router.get("/{business_id}")
async def get_lead(business_id: UUID):
    biz = get_business(business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return {
        "business": biz,
        "contacts": get_contacts_for_business(business_id),
        "score": get_score(business_id),
        "outreach": get_outreach(business_id),
    }


# ── Scrape ────────────────────────────────────────────────────────────────────

@router.post("/scrape")
async def start_scrape(params: ScrapeJobParams, background_tasks: BackgroundTasks):
    job = create_scrape_job("scrape", params.model_dump())
    background_tasks.add_task(_run_scrape, job["id"], params)
    return {"job_id": job["id"], "status": "pending"}


async def _run_scrape(job_id: str, params: ScrapeJobParams):
    from datetime import datetime, timezone
    update_scrape_job(job_id, status="running", started_at=datetime.now(timezone.utc).isoformat())
    saved = 0
    failed = 0
    try:
        from lead_gen.scrapers.google_maps import GoogleMapsScraper
        from lead_gen.scrapers.chamber import ChamberScraper
        from lead_gen.scrapers.mn_sos import MNSOSScraper

        scrapers = [GoogleMapsScraper(), ChamberScraper(), MNSOSScraper()]
        all_businesses = []
        for scraper in scrapers:
            try:
                results = await scraper.scrape(params)
                all_businesses.extend(results)
            except Exception as e:
                logger.error(f"Scraper {scraper.__class__.__name__} error: {e}")

        for biz in all_businesses:
            try:
                upsert_business(biz)
                saved += 1
            except Exception as e:
                logger.error(f"Business upsert error: {e}")
                failed += 1

        update_scrape_job(
            job_id,
            status="completed",
            records_found=len(all_businesses),
            records_saved=saved,
            records_failed=failed,
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        update_scrape_job(
            job_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        logger.error(f"Scrape job {job_id} failed: {e}")


# ── Enrich ────────────────────────────────────────────────────────────────────

@router.post("/enrich")
async def start_enrich(background_tasks: BackgroundTasks, limit: int = 20):
    job = create_scrape_job("enrich", {"limit": limit})
    background_tasks.add_task(_run_enrich, job["id"], limit)
    return {"job_id": job["id"], "status": "pending"}


async def _run_enrich(job_id: str, limit: int):
    from datetime import datetime, timezone
    update_scrape_job(job_id, status="running", started_at=datetime.now(timezone.utc).isoformat())
    saved = 0
    failed = 0
    try:
        businesses = list_businesses_unenriched(limit)
        finder = ContactFinder()

        for biz in businesses:
            try:
                contacts, signals = await finder.find_contacts(biz)
                for contact in contacts:
                    upsert_contact(contact)
                # Update business with signals
                if signals.get("years_in_business"):
                    from lead_gen.db.client import get_supabase
                    get_supabase().table("businesses").update({
                        "years_in_business": signals["years_in_business"],
                        "company_size_estimate": signals.get("company_size_estimate"),
                    }).eq("id", str(biz["id"])).execute()
                mark_website_crawled(biz["id"])
                saved += 1
            except Exception as e:
                logger.error(f"Enrich error for {biz.get('business_name')}: {e}")
                failed += 1

        update_scrape_job(
            job_id,
            status="completed",
            records_found=len(businesses),
            records_saved=saved,
            records_failed=failed,
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        update_scrape_job(
            job_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.now(timezone.utc).isoformat(),
        )


# ── Score ─────────────────────────────────────────────────────────────────────

@router.post("/score")
async def start_score(background_tasks: BackgroundTasks, limit: int = 50):
    job = create_scrape_job("score", {"limit": limit})
    background_tasks.add_task(_run_score, job["id"], limit)
    return {"job_id": job["id"], "status": "pending"}


async def _run_score(job_id: str, limit: int):
    from datetime import datetime, timezone
    update_scrape_job(job_id, status="running", started_at=datetime.now(timezone.utc).isoformat())
    saved = 0
    failed = 0
    try:
        businesses = list_businesses_unscored()[:limit]
        scorer = CREScorer()

        for biz in businesses:
            try:
                contacts = get_contacts_for_business(biz["id"])
                # Use signals from enrichment if available in contacts
                signals = {}
                score = await scorer.score_business(biz, contacts, signals)
                upsert_score(score)
                saved += 1
            except Exception as e:
                logger.error(f"Score error for {biz.get('business_name')}: {e}")
                failed += 1

        update_scrape_job(
            job_id,
            status="completed",
            records_found=len(businesses),
            records_saved=saved,
            records_failed=failed,
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        update_scrape_job(
            job_id,
            status="failed",
            error_message=str(e),
            finished_at=datetime.now(timezone.utc).isoformat(),
        )


# ── Outreach ──────────────────────────────────────────────────────────────────

@router.post("/outreach")
async def generate_outreach(req: OutreachGenerateRequest):
    biz = get_business(req.business_id)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    contacts = get_contacts_for_business(req.business_id)
    contact = None
    if req.contact_id:
        contact = next((c for c in contacts if str(c["id"]) == str(req.contact_id)), None)
    elif contacts:
        contact = contacts[0]

    score = get_score(req.business_id) or {}

    generator = OutreachGenerator()
    try:
        result = await generator.generate_for_lead(biz, contact, score, req.angle)
        saved = save_outreach(result)
        return {"outreach": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Contact status ────────────────────────────────────────────────────────────

@router.patch("/contacts/{contact_id}/status")
async def update_status(contact_id: UUID, status: str, notes: Optional[str] = None):
    valid_statuses = {"new", "emailed", "called", "linkedin", "responded", "meeting_set", "not_interested", "closed"}
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    update_contact_status(contact_id, status, notes)
    return {"updated": True}


# ── Export ────────────────────────────────────────────────────────────────────

@router.get("/export/csv")
async def export_csv(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_score: int = 0,
    outreach_status: Optional[str] = None,
    limit: int = Query(default=500, le=5000),
):
    filters = LeadFilter(industry=industry, city=city, min_score=min_score,
                         outreach_status=outreach_status, limit=limit)
    exporter = CSVExporter()
    try:
        csv_bytes = await exporter.export(filters)
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=cre_leads.csv"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/sheets")
async def export_sheets(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_score: int = 0,
    limit: int = Query(default=500, le=5000),
    sheet_id: Optional[str] = None,
):
    filters = LeadFilter(industry=industry, city=city, min_score=min_score, limit=limit)
    exporter = SheetsExporter()
    try:
        result = await exporter.export(filters, sheet_id=sheet_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/airtable")
async def export_airtable(
    industry: Optional[str] = None,
    city: Optional[str] = None,
    min_score: int = 0,
    limit: int = Query(default=500, le=5000),
):
    filters = LeadFilter(industry=industry, city=city, min_score=min_score, limit=limit)
    exporter = AirtableExporter()
    try:
        result = await exporter.export(filters)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Jobs ──────────────────────────────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(limit: int = 20):
    return {"jobs": list_scrape_jobs(limit)}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = get_scrape_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
