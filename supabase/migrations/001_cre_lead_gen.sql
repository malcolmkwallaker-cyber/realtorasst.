-- ============================================================
-- CRE Lead Gen MVP — Supabase Schema
-- Run in the Supabase SQL Editor or via: supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── businesses ────────────────────────────────────────────────────────────────
create table if not exists businesses (
    id                   uuid primary key default gen_random_uuid(),
    business_name        text not null,
    source               text not null,
    industry             text,
    industry_raw         text,
    website              text,
    phone                text,
    email                text,
    contact_page_url     text,
    address              text,
    city                 text,
    state                text default 'MN',
    zip                  text,
    county               text,
    company_size_estimate text,
    years_in_business    integer,
    mn_sos_filing_date   text,
    mn_sos_id            text,
    -- enrichment tracking
    website_crawled      boolean not null default false,
    enriched_at          timestamptz,
    scraped_at           timestamptz not null default now(),
    -- dedup
    dedup_key            text unique,
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

create index if not exists idx_businesses_industry on businesses (industry);
create index if not exists idx_businesses_city     on businesses (city);
create index if not exists idx_businesses_source   on businesses (source);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_businesses_updated_at on businesses;
create trigger trg_businesses_updated_at
    before update on businesses
    for each row execute function set_updated_at();


-- ── contacts ──────────────────────────────────────────────────────────────────
create table if not exists contacts (
    id               uuid primary key default gen_random_uuid(),
    business_id      uuid not null references businesses (id) on delete cascade,
    full_name        text,
    first_name       text,
    last_name        text,
    title            text,
    title_normalized text,
    email            text,
    email_confidence float,
    phone_direct     text,
    linkedin_url     text,
    found_on_page    text,
    found_via        text,
    outreach_status  text not null default 'new',
    notes            text,
    last_contacted_at timestamptz,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists idx_contacts_business_id     on contacts (business_id);
create index if not exists idx_contacts_outreach_status on contacts (outreach_status);

drop trigger if exists trg_contacts_updated_at on contacts;
create trigger trg_contacts_updated_at
    before update on contacts
    for each row execute function set_updated_at();


-- ── cre_scores ────────────────────────────────────────────────────────────────
create table if not exists cre_scores (
    id                uuid primary key default gen_random_uuid(),
    business_id       uuid not null references businesses (id) on delete cascade,
    score_tenant      integer not null check (score_tenant      between 0 and 100),
    score_owner_user  integer not null check (score_owner_user  between 0 and 100),
    score_expanding   integer not null check (score_expanding   between 0 and 100),
    score_relocating  integer not null check (score_relocating  between 0 and 100),
    score_investor    integer not null check (score_investor    between 0 and 100),
    score_overall     integer not null check (score_overall     between 0 and 100),
    reasoning         jsonb   not null default '{}',
    signals           jsonb   not null default '{}',
    model_version     text    not null default 'v1',
    scored_at         timestamptz not null default now(),
    created_at        timestamptz not null default now()
);

create index if not exists idx_cre_scores_business_id   on cre_scores (business_id);
create index if not exists idx_cre_scores_score_overall on cre_scores (score_overall desc);


-- ── scrape_jobs ───────────────────────────────────────────────────────────────
create table if not exists scrape_jobs (
    id              uuid primary key default gen_random_uuid(),
    job_type        text not null,          -- 'scrape' | 'enrich' | 'score'
    status          text not null default 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
    params          jsonb,
    records_found   integer not null default 0,
    records_saved   integer not null default 0,
    records_failed  integer not null default 0,
    error_message   text,
    started_at      timestamptz,
    finished_at     timestamptz,
    created_at      timestamptz not null default now()
);

create index if not exists idx_scrape_jobs_status     on scrape_jobs (status);
create index if not exists idx_scrape_jobs_created_at on scrape_jobs (created_at desc);


-- ── outreach_templates ────────────────────────────────────────────────────────
create table if not exists outreach_templates (
    id                   uuid primary key default gen_random_uuid(),
    business_id          uuid not null references businesses (id) on delete cascade,
    contact_id           uuid references contacts (id) on delete set null,
    cold_email_subject   text,
    cold_email_body      text,
    linkedin_message     text,
    cold_call_opener     text,
    voicemail_script     text,
    followup_day3        text,
    followup_day7        text,
    followup_day14       text,
    personalization_notes text,
    generated_at         timestamptz not null default now(),
    created_at           timestamptz not null default now()
);

create index if not exists idx_outreach_business_id on outreach_templates (business_id);


-- ── export_logs ───────────────────────────────────────────────────────────────
create table if not exists export_logs (
    id             uuid primary key default gen_random_uuid(),
    export_type    text not null,   -- 'csv' | 'sheets' | 'airtable'
    record_count   integer not null default 0,
    destination    text,
    filters_applied jsonb,
    created_at     timestamptz not null default now()
);


-- ── Helper RPCs (called by get_summary_stats) ─────────────────────────────────

create or replace function count_by_industry()
returns table (industry text, cnt bigint)
language sql stable as $$
    select coalesce(industry, 'Unknown'), count(*)
    from   businesses
    group  by 1
    order  by 2 desc
    limit  20;
$$;

create or replace function count_by_city()
returns table (city text, cnt bigint)
language sql stable as $$
    select coalesce(city, 'Unknown'), count(*)
    from   businesses
    group  by 1
    order  by 2 desc
    limit  20;
$$;

create or replace function count_by_status()
returns table (outreach_status text, cnt bigint)
language sql stable as $$
    select outreach_status, count(*)
    from   contacts
    group  by 1
    order  by 2 desc;
$$;
