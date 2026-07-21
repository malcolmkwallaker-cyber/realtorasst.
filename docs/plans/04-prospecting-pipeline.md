# Plan 4 — Expired / FSBO Prospecting Pipeline

Implements Roadmap move #4. Read `CLAUDE.md`, `docs/ROADMAP.md` §4, and
`.claude/skills/add-generator/` first. This is mostly an instance of the
standard generator pattern with a batch twist and a CRM write-back.

## Goal

Paste this week's expired/FSBO list, click once, get personalized outreach per
prospect, and have each prospect logged as a contact so week 2 follow-ups can
reference week 1.

## Part A — Prompt builder

**New file:** `nextjs/prompts/prospectingPrompt.ts`

Follow `.claude/skills/write-realtor-prompts/` exactly. Inputs:
- `prospect_type`: `'expired' | 'fsbo'` (Select in the form)
- `prospects`: a multiline Textarea; one prospect per line in the loose format
  `Name, Address, City, [phone], [notes]` (the prompt tolerates missing parts —
  use `text()` fallbacks per prospect field)
- `week_number`: which touch this is (1 = first contact, 2+ = follow-up)

Builder behavior: split `prospects` on newlines, cap at 15 lines (log/ignore the
rest and say so in the UI hint text — silent truncation is banned by house
style), and return one `PromptSpec` per prospect:
```
{ id: `prospect_${i}`, label: `${name || 'Prospect ' + (i+1)}`, prompt: ... }
```
The per-prospect prompt: a call script AND a text message for that prospect, led
by the correct angle (expired: fresh marketing plan and what will be different;
FSBO: offer value without pressure, safety and paperwork pain points; see
`docs/RESEARCH-VAULT.md` §1-2 for vocabulary). For `week_number > 1`, the prompt
must reference that this is a follow-up touch and vary the approach.

Note the existing seller prompts (`nextjs/prompts/sellerPrompt.ts`) already have
expired/FSBO specs for a single prospect; read them for tone parity but build
this as its own module — batch semantics are different enough.

## Part B — Register + type + form + page + sidebar

Standard `.claude/skills/add-generator/` steps:
1. `BUILDERS.prospecting = buildProspectingPrompt` in
   `nextjs/app/api/generate/route.ts`.
2. Add `'prospecting'` to `GeneratorType` in `nextjs/types/index.ts`.
3. `nextjs/components/forms/ProspectingForm.tsx`: Select (expired/FSBO), Select
   (week 1-4), Textarea (paste list) with helper text "One prospect per line:
   Name, Address, City, phone, notes. Up to 15 per batch."
4. `nextjs/app/(dashboard)/prospecting/page.tsx` + sidebar entry
   `{ href: '/prospecting', label: 'Prospecting', icon: Target }`.

## Part C — CRM write-back

After a successful generation (in `ProspectingForm`, after `GeneratorShell`
returns outputs — or via a small callback prop if the shell doesn't expose
completion; check the component before deciding), upsert each prospect into
`contacts`:
```ts
{
  user_id,
  first_name, last_name,        // parsed from the name, best effort
  contact_type: 'seller',
  lead_source: prospectType,     // 'expired' | 'fsbo'
  market_area: city,
  notes: `Week ${weekNumber} outreach generated ${date}`,
}
```
Dedupe on (first_name, last_name, market_area) with a select-before-insert; if
the contact exists, append to `notes` instead of inserting. And log one
`conversations` row per prospect (`channel: 'call'`, `direction: 'outbound'`,
`message: 'Outreach draft generated, week N'`) so Goal G2's stale-lead logic
sees these as touched.

## Guardrails

- The system drafts, the human calls/texts. No sending. (G2 constraint.)
- Cap 15 prospects per batch: 15 parallel API calls is the same shape as the
  10-tab listing generation, fine; 100 would not be.
- Empty input: show a plain-sentence error ("Paste at least one prospect, one
  per line."), do not call the API.

## Acceptance criteria

1. `npm run build` passes.
2. Paste 3 fake prospects, week 1, expired: 3 tabs, each personalized with the
   right name/address, voice-clean (no emoji, no dash punctuation, no preamble).
3. Same 3 prospects again: contacts deduped (3 rows total, notes appended),
   3 new `conversations` rows.
4. Week 2 run: output references it being a follow-up.
5. One prospect line with only a name: output still usable (fallbacks working).
6. Run `.claude/skills/ship-check/`.
