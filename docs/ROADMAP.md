# Roadmap — The Consultant Audit

Ranked moves for this product, highest ROI first, with the reasoning written down so a
cheaper model (or a person) can execute each one without re-deriving the strategy.
Each move includes "what to tell a weaker model" — a paste-ready brief.

The lens used to rank: Malcolm's constraint is **time, not software**. Every move is
scored by minutes-per-week returned to him or dollars generated per hour of build time.
Features that are impressive but don't remove a recurring task were pushed down or cut.

---

## 1. Ship the Next.js app to production and make it the daily driver

**Why first:** All value is theoretical until the app is the thing he opens every
morning. The FastAPI and GAS versions splitting usage means no habit forms, no
feedback accumulates, and no data (contacts, properties, generated content) builds up
in Supabase. Everything below compounds on top of daily use.

**Exact steps:** Deploy `nextjs/` to Vercel (root dir `nextjs`, 4 env vars incl.
`ANTHROPIC_MODEL`), run the migration in Supabase, create the user, fill Settings
completely (this personalizes every output), bookmark on phone + desktop, use it for
every listing and client touch for 2 weeks before building anything new.

**What to tell a weaker model:** "Follow nextjs/README.md deploy section verbatim.
Do not modify code. If a build error occurs, fix only the error, run `npm run build`
until clean, and list every file you touched."

---

## 2. Wire generated content and CRM records together (close the loop)

**Why second:** The schema already has `contacts`, `properties`, `generated_content`
with relation columns, but generation currently starts from a blank form each time.
Re-typing property details is the single biggest recurring friction. Picking an
existing property/contact and having the form pre-fill turns a 3-minute task into a
15-second one, and makes the CRM tables worth maintaining.

**Exact steps:** Add a property picker to ListingForm (select from `properties`,
prefill inputs), a contact picker to Buyer/Seller forms, and save every generation to
`generated_content` with the related IDs (OutputCard already receives them). Add a
"History" view per property/contact.

**What to tell a weaker model:** "Add a Select that lists rows from the `properties`
table for the signed-in user, and on selection copy address/city/price/beds/baths/
sqft/acres/lake/waterfront/features into the existing form state. Do not change the
prompt builders. Follow CLAUDE.md conventions; run /ship-check before finishing."

---

## 3. Daily plan on autopilot (morning email/text)

**Why third:** The daily planner is the highest-frequency module (365 uses/year) but
it requires opening the app and typing what's already in the CRM. A cron (Vercel Cron
or Supabase scheduled function) that reads today's tasks + active leads from the DB,
generates the plan, and emails it at 6am converts the app from a tool into a system
that runs without him. This is the "fire the goals" move — see docs/GOALS.md G1.

**Exact steps:** Vercel Cron route `app/api/cron/daily-plan/route.ts` guarded by
`CRON_SECRET`; query tasks due today + contacts with status active; reuse the
assistant system prompt; send via Resend (free tier). Use `claude-haiku-4-5` here —
it's a structured summarization task, ideal for the cheap engine.

**What to tell a weaker model:** the paragraph above is the spec; add "never expose
the cron route without checking the secret header, and load settings server-side."

---

## 4. Expired / FSBO pipeline as a weekly system

**Why fourth:** Highest dollar-per-use module. One expired-listing conversion pays
for years of software. The seller prompts already exist; what's missing is cadence:
a place to paste this week's expired/FSBO list, generate the outreach batch in one
click, and log who was contacted so week 2 follow-ups reference week 1.

**What to tell a weaker model:** "New generator page `prospecting` that accepts a
pasted list of addresses/names, loops the existing seller expired/FSBO prompt specs
per row, and writes each contact to `contacts` with `contact_type` seller and
`lead_source` expired|fsbo. One output tab per prospect."

---

## 5. Recruiting cadence tracker

Same shape as #4 but for agent recruits (`contact_type: 'agent_recruit'` exists).
Recruiting compounds brokerage revenue, but touches convert on the 5th–8th contact,
which nobody sustains manually. Generate touch N with the context of touches 1..N-1
from `conversations`.

---

## 6. Voice-note → anything (mobile capture)

Malcolm's context happens in the truck between showings. A single mobile page that
records audio, transcribes, and routes to the assistant ("turn this into a VA
handoff / follow-up text / task list") removes the keyboard bottleneck entirely.
Do after 1–3 because it multiplies whatever exists, not before there's something
to multiply.

---

## Stop doing (with reasoning)

1. **Stop maintaining three implementations.** Every hour on `main.py` or `gas/` is
   an hour not compounding in the canonical app. Freeze them; delete after the Vercel
   deploy has run for a month. (They stay in git history forever.)
2. **Stop adding new generator types before the loop closes (#2).** More one-shot
   generators widen the app; wiring them to data deepens it. Width without depth
   is why SaaS tools get abandoned.
3. **Stop hand-tuning prompts by vibes.** Change a prompt only against the checklist
   in `.claude/skills/write-realtor-prompts/`, comparing before/after output on the
   same inputs. Prompt thrash silently degrades modules that already worked.

## Explicitly considered and cut

- **Multi-tenant SaaS-ification** (selling this to other agents): real option, wrong
  order. Prove daily personal use first; the settings table already makes it
  multi-tenant-ready when the time comes.
- **MLS/IDX integration:** high effort, brittle vendor APIs, and the manual property
  form with picker (#2) covers 90% of the value at 5% of the cost.
- **Fine-tuning a model:** unnecessary. The voice is fully captured by the system
  prompt + settings; cheaper engines follow it well. Spend nothing here.
