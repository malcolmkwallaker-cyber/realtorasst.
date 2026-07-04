# Cloud accounts, save & lead capture

Let players save their progress across devices with just an **email**, and
collect every player as a lead (name, email, phone, game stats) in a database
you own. It's **off by default** — the game works exactly as before until you
add your keys.

## Setup (about 5 minutes)

1. **Create a free Supabase project** at [supabase.com](https://supabase.com)
   (New project → pick a name/password → wait ~2 min for it to spin up).

2. **Create the table + functions.** In your project: **SQL Editor → New query**,
   paste the entire contents of [`schema.sql`](./schema.sql), and click **Run**.

3. **Add your keys to the game.** In Supabase go to **Project Settings → API**
   and copy your **Project URL** and the **anon / public** key. Open
   `game/src/cloud.js` and paste them at the top:

   ```js
   URL: 'https://YOURPROJECT.supabase.co',
   ANON_KEY: 'eyJ...your anon public key...',
   ```

   ⚠️ Use the **anon public** key only. Never put the `service_role` key in the
   game — it's a secret that bypasses all security.

4. **Redeploy** (commit/push, or `node game/tools/bundle.js` for the single file).
   A **SIGN IN / SAVE** option now appears on the title screen.

## Where your leads live

- **See them:** Supabase → **Table Editor → `rr_players`**.
- **Export:** that table's **⋯ menu → Export to CSV** (import into your CRM/email tool).
- **Most engaged first** (SQL Editor):
  ```sql
  select name, email, phone, homes_sold, score, seasons_played, last_seen
  from rr_players
  where consent
  order by score desc, last_seen desc;
  ```

Each row updates automatically as the player plays: contact info, best homes
sold, followers, best score, seasons completed, and last-seen time — so you can
see who's genuinely engaged and reach out to the warmest ones first.

## How it's kept safe

- The `rr_players` table has Row Level Security on with **no public policies**,
  so the embedded anon key **cannot read your lead list**.
- The game can only call two locked-down functions: save-by-email and
  load-by-email. Nobody can bulk-scrape emails/phones with the public key.
- You read the data yourself via the Supabase dashboard (or your Next.js admin,
  using the server-side `service_role` key).

## Consent / compliance notes

- The sign-in form is **optional** (players can Skip) and includes a consent
  checkbox; only contact players who checked it.
- Follow standard rules for your outreach (CAN-SPAM: include an unsubscribe in
  emails; honor opt-outs; Fair Housing: no discriminatory targeting).

## Turning it off

Leave `URL`/`ANON_KEY` blank in `cloud.js` and cloud features simply don't
appear — the game falls back to local (device-only) saves.
