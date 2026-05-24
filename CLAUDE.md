# Realtor Assistant + CRE Lead Gen MVP

## What this is

A FastAPI + Claude-powered tool for real estate agents with two major components:

1. **Realtor Daily Assistant** — AI-generated daily plans, VA handoff briefs, and agent training guides (always-on, needs only `ANTHROPIC_API_KEY`)
2. **CRE Lead Gen module** — Commercial real estate lead scraping, enrichment, AI scoring, personalised outreach generation, and export to CSV / Google Sheets / Airtable (opt-in, requires Supabase + OpenAI keys)

---

## Project layout

```
realtorasst./
├── main.py                        # FastAPI entrypoint; mounts lead_gen router if Supabase keys present
├── requirements.txt
├── run.sh                         # Dev launch helper
├── .env.example                   # All env vars documented here
├── static/                        # Front-end for the Daily Assistant
│   ├── index.html
│   ├── style.css
│   └── app.js
├── gas/                           # Google Apps Script version of the Daily Assistant
├── lead_gen/                      # CRE Lead Gen module
│   ├── config.py                  # Pydantic Settings — reads .env
│   ├── models.py                  # Pydantic models (BusinessCreate, ContactCreate, CREScoreCreate …)
│   ├── api.py                     # FastAPI router — all /api/leads/* endpoints
│   ├── db/
│   │   ├── client.py              # Supabase client singleton
│   │   └── queries.py             # All DB read/write functions
│   ├── scrapers/
│   │   ├── base.py                # BaseScraper (robots.txt, polite delay, normalizers)
│   │   ├── google_maps.py         # Google Maps via Playwright (or SerpAPI fallback)
│   │   ├── chamber.py             # MN Chamber of Commerce member directories
│   │   ├── mn_sos.py              # MN Secretary of State public business search
│   │   └── website.py             # Per-business website spider (About/Team/Contact pages)
│   ├── enrichment/
│   │   ├── ai_enricher.py         # OpenAI: extract contacts + business signals from page text
│   │   ├── contact_finder.py      # Orchestrates website crawl → AI extraction → ContactCreate
│   │   └── email_finder.py        # Email pattern inference from visible on-domain emails
│   ├── scoring/
│   │   └── cre_scorer.py          # OpenAI: score businesses on 5 CRE dimensions (0-100)
│   ├── outreach/
│   │   └── generator.py           # OpenAI: generate cold email, LinkedIn, call scripts, follow-ups
│   └── export/
│       ├── csv_exporter.py
│       ├── sheets_exporter.py     # Requires Google service account JSON key
│       └── airtable_exporter.py
└── supabase/
    └── migrations/
        └── 001_cre_lead_gen.sql   # Full DB schema — run once in Supabase SQL Editor
```

---

## Quick start

```bash
# 1. Install deps
pip install -r requirements.txt
playwright install chromium       # only needed for web scraping

# 2. Configure
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY

# 3. Run
./run.sh
# or: uvicorn main:app --reload --port 8000
```

Open http://localhost:8000

---

## Enabling the CRE Lead Gen module

The lead gen router is automatically mounted when **all three** of these are set in `.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### Database setup

Run `supabase/migrations/001_cre_lead_gen.sql` in the Supabase SQL Editor. This creates:

| Table | Purpose |
|---|---|
| `businesses` | Scraped business records (deduplicated by `dedup_key`) |
| `contacts` | Decision-maker contacts per business |
| `cre_scores` | AI-generated 5-dimension CRE scores |
| `outreach_templates` | Generated cold email, call script, LinkedIn, follow-ups |
| `scrape_jobs` | Background job tracking (scrape / enrich / score) |
| `export_logs` | Audit trail for CSV/Sheets/Airtable exports |

---

## API endpoints

### Realtor Daily Assistant
| Method | Path | Description |
|---|---|---|
| POST | `/api/daily-plan` | Generate a time-blocked day plan |
| POST | `/api/va-handoff` | Write a task brief for a VA |
| POST | `/api/agent-howto` | Generate agent training guide |

### CRE Lead Gen (`/api/leads/*`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/leads/stats` | Dashboard summary counts |
| GET | `/api/leads` | List leads with filters |
| GET | `/api/leads/{id}` | Single lead (business + contacts + score + outreach) |
| POST | `/api/leads/scrape` | Start a background scrape job |
| POST | `/api/leads/enrich` | Start a background enrichment job |
| POST | `/api/leads/score` | Start a background scoring job |
| POST | `/api/leads/outreach` | Generate outreach for one business |
| PATCH | `/api/leads/contacts/{id}/status` | Update contact outreach status |
| GET | `/api/leads/export/csv` | Download filtered leads as CSV |
| POST | `/api/leads/export/sheets` | Push leads to Google Sheets |
| POST | `/api/leads/export/airtable` | Upsert leads into Airtable |
| GET | `/api/leads/jobs` | List recent background jobs |
| GET | `/api/leads/jobs/{id}` | Get status of one job |

---

## CRE scoring model

Each business is scored 0–100 on five dimensions:

| Dimension | Weight | Meaning |
|---|---|---|
| `score_tenant` | 35% | Likelihood to lease commercial space |
| `score_expanding` | 25% | Likely adding a new or larger location |
| `score_owner_user` | 20% | Likely to buy property for own operations |
| `score_relocating` | 15% | Likely to move from current space |
| `score_investor` | 5% | Likely to acquire CRE as investment |

`score_overall` is a weighted composite of all five.

---

## Scraping ethics

- All scrapers respect `robots.txt` (see `BaseScraper._check_robots`)
- Polite delay between requests (default 2 s, configurable via `SCRAPE_DELAY_SECONDS`)
- Google Maps scraper prefers SerpAPI (if `SERPAPI_KEY` set) over Playwright
- MN SOS data is a fully public government database
- Chamber directories only scrape voluntarily published member listings

---

## Environment variables reference

See `.env.example` for the full list with descriptions.

Key variables:

| Variable | Required for | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Daily Assistant | Always required |
| `SUPABASE_URL` | Lead Gen | Activates the lead gen module |
| `SUPABASE_SERVICE_KEY` | Lead Gen | Service role key (not anon key) |
| `OPENAI_API_KEY` | Lead Gen | Used for enrichment, scoring, outreach |
| `OPENAI_MODEL` | Lead Gen | Default: `gpt-4o-mini` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Sheets export | Path to GCP service account key JSON |
| `GOOGLE_SHEET_ID` | Sheets export | Target spreadsheet ID |
| `AIRTABLE_API_KEY` | Airtable export | Personal access token |
| `AIRTABLE_BASE_ID` | Airtable export | Base ID (starts with `app`) |
| `SERPAPI_KEY` | Optional | Faster Google Maps fallback |
