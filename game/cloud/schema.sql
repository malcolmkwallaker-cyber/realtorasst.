-- ============================================================
-- Realtor Rivals - cloud accounts + save + lead capture (Supabase)
-- Run this once in your Supabase project: SQL Editor -> paste -> Run.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists rr_players (
  id             uuid primary key default gen_random_uuid(),
  email          text unique not null,
  name           text,
  phone          text,
  consent        boolean default false,   -- opted in to be contacted
  homes_sold     integer default 0,       -- best-ever (lead-scoring signal)
  followers      integer default 0,
  score          integer default 0,
  seasons_played integer default 0,
  save           jsonb,                    -- the player's game state
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  last_seen      timestamptz default now()
);

-- Lock the table down: no direct access with the public anon key.
-- All access goes through the two SECURITY DEFINER functions below,
-- so nobody can bulk-read your leads with the embedded anon key.
alter table rr_players enable row level security;

-- Upsert a player + their save + stats (called by the game).
create or replace function rr_upsert(p_email text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into rr_players (email, name, phone, consent, save,
                          homes_sold, followers, score, seasons_played,
                          updated_at, last_seen)
  values (
    lower(trim(p_email)),
    nullif(p_payload->>'name',''),
    nullif(p_payload->>'phone',''),
    coalesce((p_payload->>'consent')::boolean, false),
    p_payload->'save',
    coalesce((p_payload->>'homes_sold')::int, 0),
    coalesce((p_payload->>'followers')::int, 0),
    coalesce((p_payload->>'score')::int, 0),
    coalesce((p_payload->>'seasons_played')::int, 0),
    now(), now()
  )
  on conflict (email) do update set
    name           = coalesce(nullif(excluded.name,''),  rr_players.name),
    phone          = coalesce(nullif(excluded.phone,''), rr_players.phone),
    consent        = rr_players.consent or excluded.consent,
    save           = excluded.save,
    homes_sold     = greatest(rr_players.homes_sold,     excluded.homes_sold),
    followers      = greatest(rr_players.followers,      excluded.followers),
    score          = greatest(rr_players.score,          excluded.score),
    seasons_played = greatest(rr_players.seasons_played, excluded.seasons_played),
    updated_at     = now(),
    last_seen      = now();
end;
$$;

-- Return only the save blob for one email (minimal exposure).
create or replace function rr_load(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v jsonb;
begin
  select save into v from rr_players where email = lower(trim(p_email));
  return v;
end;
$$;

-- Let the game (anon key) call ONLY these two functions.
revoke all on function rr_upsert(text, jsonb) from public;
revoke all on function rr_load(text)          from public;
grant execute on function rr_upsert(text, jsonb) to anon;
grant execute on function rr_load(text)          to anon;

-- ------------------------------------------------------------
-- View your leads: Supabase -> Table Editor -> rr_players
-- Export: that table's "..." menu -> Export to CSV.
-- Most engaged first:
--   select name, email, phone, homes_sold, score, seasons_played, last_seen
--   from rr_players where consent order by score desc;
-- ------------------------------------------------------------
