# Pemberton AI Assistant — Operating Manual

This file is the standing judgment for this repo. It was written so that any model
(or any engine) working here can produce work at the same bar without re-deriving
the reasoning. Read this first, follow it exactly, and escalate per the rules at
the bottom when something falls outside it.

## What this software is

An AI back office for Malcolm Wallaker, Pemberton Real Estate, Northern Minnesota
(Grand Rapids, Itasca County, Iron Range, Duluth, Brainerd, lake home markets).
It generates the daily written output of a real estate business: listing marketing,
buyer/seller communication, recruiting outreach, content, task checklists, VA
handoffs, and an open-ended chat assistant.

There are three implementations, newest is canonical:

| Directory | What it is | Status |
|---|---|---|
| `nextjs/` | Next.js 14 App Router + Supabase (auth, Postgres, RLS) + Anthropic API | **Canonical. All new work goes here unless told otherwise.** |
| `gas/` | Google Apps Script web app (clasp) | Legacy/lightweight deploy. Keep API-compatible, don't extend. |
| `main.py` + `static/` | FastAPI single-file prototype | Prototype. Don't extend. |

## Architecture map (Next.js app)

The whole app is one repeating pattern. Understand it once and every module is the same:

```
page.tsx (dashboard route)  →  Form component  →  GeneratorShell  →  POST /api/generate
                                                                        │
                                              prompts/<type>Prompt.ts ──┤ builds PromptSpec[]
                                              lib/anthropic.ts ─────────┤ system prompt + MODEL
                                              Supabase user_settings ───┘ personalization
```

- `prompts/*.ts` — one builder per module. Each returns `PromptSpec[]` (`{id, label, prompt}`);
  each spec becomes one API call and one output tab. `prompts/common.ts` has the shared
  helpers (`text`, `list`, `identity`) — always use them, never `??` alone (empty form
  strings are "missing", not values).
- `app/api/generate/route.ts` — auth check, loads settings server-side, maps `type` to a
  builder via `BUILDERS`, runs all prompts with `Promise.all`.
- `app/api/assistant/route.ts` — the chat endpoint; separate system prompt
  (`buildAssistantSystemPrompt`), history capped at 30 messages, merges consecutive
  same-role messages.
- `lib/anthropic.ts` — client singleton, the two system prompts, and `MODEL`
  (from `ANTHROPIC_MODEL`, default `claude-sonnet-4-6`).
- `supabase/migrations/001_initial.sql` — schema. Every table has `user_id` + RLS policy
  `auth.uid() = user_id`. Settings personalize every prompt.

## Non-negotiable conventions

1. **Output voice** (enforced in the system prompt, never contradict it in a task prompt):
   no emojis; no dashes as punctuation; copy-paste ready with no preamble or trailing
   notes; weave in agent name, brokerage, and local market references where natural.
2. **Settings are server state.** Never accept agent name, brokerage, markets, or VA name
   from the client request. Always load `user_settings` server-side.
3. **Every generated prompt gets a fallback for every input.** Use `text(inputs.x, '[X]')`.
   The app must produce usable output from an empty form.
4. **Auth first in every API route.** `supabase.auth.getUser()`; 401 with a plain-English
   message if absent.
5. **Model is `MODEL` from `lib/anthropic.ts`.** Never hard-code a model ID in a route.
6. **Handle `stop_reason === 'max_tokens'`** by appending the truncation notice, as the
   existing routes do.
7. **New tables**: `user_id UUID REFERENCES auth.users`, RLS enabled, owner policy,
   `updated_at` trigger if the table is mutable, indexes on `user_id`.
8. Errors returned to the UI are complete sentences a realtor can act on, not codes.

## Quality bar per deliverable

- **A new generator module** is done when: form has sensible defaults, every output tab
  reads like Malcolm wrote it (run one real generation and read it), no emoji/dash
  violations, `npm run build` passes with zero type errors, and the module appears in
  the sidebar. See `.claude/skills/add-generator/`.
- **A prompt change** is done when you have generated output before and after and the
  after is better against the checklist in `.claude/skills/write-realtor-prompts/`.
- **Any change** ships only after `.claude/skills/ship-check/` passes.

## Mistakes weaker models will make here (pre-corrections)

- Adding emojis, em dashes, or "Here's your listing description!" preambles to prompts.
  The formatting rules exist because outputs are pasted directly to MLS/Facebook/clients.
- Trusting client-supplied settings or inputs in API routes.
- Using `inputs.x ?? fallback` — empty string passes `??` and produces blank prompt lines.
- Hard-coding `claude-*` model strings in routes instead of importing `MODEL`.
- Editing the FastAPI or GAS versions when the ask is about "the app". Canonical is `nextjs/`.
- Creating tables without RLS. Supabase tables without policies are publicly readable
  with the anon key.
- Making the assistant system prompt generic. Its value is the specific business context
  (VA name, recruiting value prop, markets). Keep it loaded from settings.
- Writing long clever prompts. The winning pattern in this repo is short prompts with
  explicit structure: what to write, length cap, ordering, call to action, then `ctx`.

## Cost / engine policy

- `ANTHROPIC_MODEL` env var swaps engines everywhere (Next.js, FastAPI; Script Property
  in GAS). Default `claude-sonnet-4-6` ($3/$15 per MTok) for quality.
- `claude-haiku-4-5` ($1/$5 per MTok) is approved for short-form marketing copy
  (listing tabs, texts, DMs). Keep Sonnet-tier for the assistant chat and long-form
  guides where reasoning shows.
- Outputs are ~500–3000 tokens; per-generation cost is a fraction of a cent either way.
  Do not add caching complexity or batching to "save money" — the volume doesn't justify it.

## Escalation rules (exact)

Stop and ask the owner instead of proceeding when:
1. A change would alter the output voice rules or the system prompts' business facts
   (names, markets, value prop).
2. A change touches auth, RLS policies, or anything that could expose one user's data
   to another.
3. You'd need a new paid service, API key, or schema migration on production data.
4. The request conflicts with this file. Say what conflicts and propose the edit to
   this file rather than silently deviating.
Otherwise: proceed, follow the skills, and note judgment calls in the PR description.

## Where the rest of the judgment lives

- `docs/ROADMAP.md` — ranked next moves with full reasoning (the consultant audit).
- `docs/RESEARCH-VAULT.md` — market, competitor, customer-language research.
- `docs/GOALS.md` — standing goal systems with success criteria and cadences.
- `.claude/skills/how-fable-thinks/` — the decision patterns behind all of the above.
- `.claude/skills/add-generator/`, `write-realtor-prompts/`, `ship-check/` — the three
  high-leverage recurring tasks, written as recipes.
