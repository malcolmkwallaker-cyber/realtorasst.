---
name: ship-check
description: The quality gate before committing any change to this repo. Run at the end of every task that touched code, prompts, or docs.
---

# Ship Check

Run every item. If one fails, fix and re-run. Report the results explicitly in the
commit/PR description ("ship-check: all pass" or which items were N/A and why).

## Build & types

1. `cd nextjs && npm run build` completes with zero errors (skip only if no
   nextjs/ files changed).
2. No new hard-coded model IDs in routes (`grep -rn "claude-" nextjs/app` should
   only hit comments); model comes from `MODEL` in `lib/anthropic.ts`.

## Security (the three silent failures)

3. Any new/changed API route checks `supabase.auth.getUser()` before doing work.
4. Any new table: RLS enabled + owner policy + `user_id` column (check the
   migration file).
5. No client-supplied settings or identity used server-side; settings always
   loaded from `user_settings`.

## Product (only if prompts or generators changed)

6. One generation run with empty inputs → output still usable (fallbacks intact).
7. One generation run with realistic inputs → every tab read by eye:
   no emojis, no dash punctuation, no preamble/trailing notes, local voice intact.

## Knowledge upkeep (docs/GOALS.md G5)

8. If this change made a judgment call, the relevant asset was updated
   (CLAUDE.md / docs/ROADMAP.md / docs/RESEARCH-VAULT.md / docs/GOALS.md / a skill).
   If none applies, say so.
9. Commit message states what changed and why in plain language.
