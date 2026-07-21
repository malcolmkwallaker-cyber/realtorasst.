# Plan 5 — Recruiting Cadence Tracker

Implements Roadmap move #5 and Goal G4. Read `CLAUDE.md`, `docs/GOALS.md` G4,
and `docs/RESEARCH-VAULT.md` §2 first. Depends on Plan 2 being merged (uses the
contact-picker pattern and `conversations` history).

## Goal

Maintain 5 or more live agent-recruit conversations. Every touch is generated
with the context of all prior touches so no recruit ever gets the same template
twice (G4 constraint).

## Part A — Recruit pipeline view

**New file:** `nextjs/app/(dashboard)/recruiting/pipeline/page.tsx`
(sub-route of the existing recruiting section; add a small tab/link at the top
of the existing `recruiting/page.tsx` rather than a new sidebar item).

Shows all contacts where `contact_type = 'agent_recruit'`, each with:
- name, days since last outbound `conversations` row (red badge if > 14, per G4)
- touch count so far
- a "Generate next touch" button

Plus an "Add recruit" inline form (name, phone/email, notes) inserting into
`contacts` with `contact_type: 'agent_recruit'`.

## Part B — Context-aware touch generation

**Extend:** `nextjs/prompts/recruitingPrompt.ts`

Add inputs the existing builder doesn't have: `touch_number` and
`previous_touches` (a compact text summary of prior `conversations` rows for
this recruit: date + channel + first ~100 chars of each message).

The escalation ladder (encode in the prompt, one artifact per spec):
- Touch 1: social DM, low-key, personal
- Touch 2: email with the value prop (from settings `recruiting_value_prop`,
  loaded server-side as always)
- Touch 3: call script
- Touch 4+: coffee invite, then value-add drips (market stat, congratulation)

Hard rule in the prompt text: "Reference the previous outreach naturally in one
clause. Do not repeat wording from previous touches." Pass `previous_touches`
in the ctx block.

Wire the pipeline page's "Generate next touch" button to the standard
`/api/generate` flow with `type: 'recruiting'` and these inputs prefilled from
the DB. The client sends the recruit's `conversations` summary text as an input;
that is content context, not identity/settings, so it does not violate the
server-state rule — but the value prop itself still comes from server-side
settings, never from the client.

## Part C — Log the touch

After generation, insert a `conversations` row (`channel` matching the ladder
step, `direction: 'outbound'`, `message`: the generated draft, truncated to a
sane length) and link `contact_id`. This is what makes touch N+1 aware of touch N
and what the pipeline view's "days since touch" reads.

## Guardrails

- Draft only; the human sends. Never automate outreach delivery.
- If `previous_touches` is empty but `touch_number > 1`, the prompt must not
  fabricate a fake history; instruct it to write a standalone touch instead.

## Acceptance criteria

1. `npm run build` passes.
2. Add a fake recruit, generate touch 1 (DM), confirm a conversations row.
3. Generate touch 2: output is an email, references the DM in one clause,
   repeats no phrasing from it.
4. Pipeline view shows correct touch counts and staleness badges.
5. Voice check on all outputs; run `.claude/skills/ship-check/`.
