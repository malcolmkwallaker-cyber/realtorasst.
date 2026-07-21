# Execution Plans

Paste-ready briefs for any model or engine executing the roadmap
(`docs/ROADMAP.md`). Do them in order; each plan states its dependencies.

## How to run one of these plans (instructions for the executing model)

1. Read `CLAUDE.md` in full. It is the operating manual and overrides your
   defaults.
2. Read the plan file. It contains the design decisions already made — do not
   re-litigate them; if a decision seems wrong, that is an escalation
   (CLAUDE.md rule 4), not a silent deviation.
3. Load the referenced skills (`.claude/skills/...`) before touching the code
   they govern.
4. Implement, then run the plan's acceptance criteria AND
   `.claude/skills/ship-check/`.
5. Commit on a feature branch with a plain-language message; note any judgment
   calls in the PR description.

## The plans

| # | File | What it delivers | Depends on |
|---|---|---|---|
| 1 | (no file — see below) | App deployed to Vercel, daily-driver habit | nothing |
| 2 | `02-crm-loop.md` | Property/contact pickers, generation history | 1 |
| 3 | `03-daily-plan-cron.md` | 6 AM plan email from live CRM data | 1 (2 helps) |
| 4 | `04-prospecting-pipeline.md` | Expired/FSBO batch outreach + CRM write-back | 2 |
| 5 | `05-recruiting-cadence.md` | Recruit pipeline with context-aware touches | 2 |
| 6 | `06-voice-capture.md` | Mobile voice-note capture to any output | 1 |

## Plan 1 — Deploy (checklist, no separate file)

This is operational, not code. From `nextjs/README.md`:
1. Vercel project, root directory `nextjs`.
2. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL`.
3. Run `supabase/migrations/001_initial.sql` in the Supabase SQL editor.
4. Create the user account (email/password) in Supabase Auth.
5. Sign in, fill Settings completely (this personalizes every output).
6. Bookmark on phone and desktop; use daily for two weeks before building more.

## Escalation reminders that apply across all plans

- Plan 3 needs owner sign-off for Resend and the service-role key handling.
- Plan 6 needs owner sign-off only if the free browser transcription proves
  insufficient and a paid service is proposed.
- No plan requires a schema migration. If you find yourself writing one, stop
  and re-read the plan; then escalate if you still believe it is needed.
- After finishing any plan, update `docs/ROADMAP.md` (mark the move done) and
  any asset that a judgment call touched (Goal G5).
