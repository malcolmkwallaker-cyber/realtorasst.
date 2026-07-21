# Goals — Systems That Execute

Each goal is written as a runnable system: definition, success criteria, constraints,
resources, output format, and check-in cadence. Any engine (or person) picking one up
has everything needed to execute and to know when it's done. Maintain this file: when
a goal completes, mark it and add the next one.

---

## G1. The app runs Malcolm's morning without him

**Goal:** By 6:00 AM daily, a generated day plan (appointments, lead follow-ups,
top 3 actions, VA delegations) is in Malcolm's inbox, built from live CRM data.

**Success criteria:** 14 consecutive weekday deliveries; Malcolm reports acting on
it ≥4 days/week; zero manual input required after initial setup.

**Constraints & guardrails:** Cron route must verify `CRON_SECRET`; reads only the
owner's rows; uses `claude-haiku-4-5` (structured, short, cheap); if the DB has no
tasks/leads that day, still send a plan built from the weekly defaults rather than
skipping — the habit is the product.

**Resources:** Roadmap move #3 spec; `buildAssistantSystemPrompt`; Vercel Cron;
Resend free tier.

**Output format:** Plain-text email, no emojis/dashes (house rules), sections:
Schedule, Follow-ups (name + suggested message), Top 3, Delegate to VA.

**Check-in cadence:** Weekly, first 4 weeks: count deliveries, opens, and whether
the Top 3 got done. Kill or fix anything ignored 2 weeks running.

---

## G2. No lead goes 7 days untouched

**Goal:** Every `contacts` row with status `active` has an outbound `conversations`
entry within the last 7 days, or an excuse logged.

**Success criteria:** Weekly report shows 0 untouched active leads for 4 straight
weeks.

**Constraints:** The system drafts, the human sends — no auto-sending client
messages, ever (relationship risk + compliance). Drafts must reference the last
logged conversation for continuity.

**Resources:** Buyer/seller prompt builders; `conversations` table; weekly cron
that lists stale leads with a pre-drafted touch for each.

**Output format:** Monday email: table of stale leads (name, days since touch,
suggested channel) each with a paste-ready draft underneath.

**Check-in cadence:** Monday review, 10 minutes: send/edit/skip each draft; skips
require a one-word reason logged to `notes`.

---

## G3. Every listing fully marketed within 24 hours of signing

**Goal:** For each new `properties` row, all 10 listing outputs (MLS, FB, IG,
email, Marketplace, video script, hooks, avatar, selling points, showing
instructions) generated, reviewed, and the property marked marketed.

**Success criteria:** Median time from property creation to marketed < 24h across
the next 10 listings.

**Constraints:** Human reads every output before it's posted (voice check);
waterfront listings must name the lake and frontage in the first sentence of MLS
copy (see RESEARCH-VAULT §1 value drivers).

**Resources:** Existing listings module; roadmap move #2 (picker/prefill) removes
the re-typing cost.

**Check-in cadence:** Per listing; monthly count of listings vs. fully-marketed.

---

## G4. Recruiting: 5 live agent-recruit conversations at all times

**Goal:** Maintain ≥5 `agent_recruit` contacts with a touch in the last 14 days,
positioning Pemberton around the settings `recruiting_value_prop`.

**Success criteria:** Pipeline count ≥5 for 8 consecutive weeks; ≥1 coffee meeting
booked per month.

**Constraints:** Touches escalate through the existing recruiting prompt ladder
(DM → email → call script → coffee invite); never send the same template twice to
one person — each touch must reference the prior one.

**Resources:** Recruiting module; `conversations` history; roadmap move #5.

**Check-in cadence:** Biweekly: pipeline count, next touch per person.

---

## G5. The knowledge vault compounds

**Goal:** The written assets in this repo (CLAUDE.md, docs/, .claude/skills/) stay
truthful and grow as decisions are made, so any engine can operate this business's
software without re-litigating strategy.

**Success criteria:** Every merged PR that makes a judgment call updates the
relevant asset (or explicitly states none applies); a new model given only this
repo produces on-voice output on the first try.

**Constraints:** Assets stay short enough to read in one sitting; delete stale
guidance rather than appending contradictions; **[verify]** tags get resolved or
re-dated when touched.

**Check-in cadence:** At every PR (see ship-check skill, which includes this).
