# Plan 3 — Daily Plan on Autopilot (morning email)

Implements Roadmap move #3 and Goal G1 (`docs/GOALS.md`). Read `CLAUDE.md`
(escalation rules especially) and `docs/GOALS.md` G1 before starting.

## Goal

By 6:00 AM daily, a generated day plan (built from live CRM data) is emailed to
Malcolm with zero manual input.

## ESCALATION NOTE (read first)

This plan adds a **new paid service** (Resend for email) and **new env vars**.
Per CLAUDE.md escalation rule 3, confirm with the owner before wiring a real
Resend key. The free tier covers this use, but the account signup is the
owner's call. Build the code; leave the key unset until approved. The route
must no-op gracefully (log, don't crash) when `RESEND_API_KEY` is absent.

## Engine choice

Use `claude-haiku-4-5` for this route specifically (structured summarization,
short output, runs unattended daily). This is the documented exception in
CLAUDE.md's cost policy. Read from a dedicated constant so it is explicit:

```ts
const CRON_MODEL = process.env.ANTHROPIC_CRON_MODEL || 'claude-haiku-4-5'
```

## Part A — The cron route

**New file:** `nextjs/app/api/cron/daily-plan/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, buildAssistantSystemPrompt } from '@/lib/anthropic'
import { createServiceClient } from '@/lib/supabase/service'  // Part B

const CRON_MODEL = process.env.ANTHROPIC_CRON_MODEL || 'claude-haiku-4-5'

export async function GET(request: NextRequest) {
  // 1. Auth: verify the cron secret header BEFORE any work.
  const secret = request.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // 2. Load today's tasks + active leads for the owner (service-role query,
  //    scoped explicitly by OWNER_USER_ID).
  // 3. Load user_settings for the owner (personalizes the assistant prompt).
  // 4. Build a prompt: "Here are today's appointments, leads, deals. Produce a
  //    time-blocked plan with top 3 priorities and VA delegations." Reuse the
  //    voice via buildAssistantSystemPrompt(settings).
  // 5. anthropic.messages.create with CRON_MODEL, max_tokens 2000. Handle
  //    stop_reason === 'max_tokens' the same way the other routes do.
  // 6. Email via Resend (Part C). If RESEND_API_KEY unset, log the plan and
  //    return { ok: true, emailed: false }.
  return NextResponse.json({ ok: true })
}
```

## Part B — Service-role Supabase access

The cron route runs with no user session, so the cookie-based
`lib/supabase/server.ts` client returns no user. Add a service-role client:

**New file:** `nextjs/lib/supabase/service.ts`
```ts
import { createClient } from '@supabase/supabase-js'

// Server-only. Uses the service-role key, which BYPASSES RLS. NEVER import this
// into a client component or a user-facing route. Only the cron route uses it.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,   // new env var, server-only
    { auth: { persistSession: false } }
  )
}
```

Query the owner's rows explicitly by `user_id` using `OWNER_USER_ID` (there is no
session to infer it from). This keeps the query scoped to one user even though
RLS is bypassed.

**Security guardrail:** the service-role key bypasses RLS entirely. It must only
be read server-side in this one file, and this file must only be imported by the
cron route. A leak exposes all users' data. This is the most dangerous part of
this plan. If the app ever goes multi-tenant, revisit.

## Part C — Email delivery (Resend)

`npm install resend`. In the cron route, after generating the plan text:
```ts
import { Resend } from 'resend'
if (process.env.RESEND_API_KEY) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'Pemberton AI <onboarding@resend.dev>',   // swap for a verified domain later
    to: process.env.OWNER_EMAIL!,
    subject: `Your day plan for ${new Date().toLocaleDateString()}`,
    text: planText,   // plain text; voice rules already applied by the prompt
  })
}
```

## Part D — Schedule it (Vercel Cron)

**New file:** `nextjs/vercel.json`
```json
{
  "crons": [{ "path": "/api/cron/daily-plan", "schedule": "0 12 * * *" }]
}
```
Vercel Cron runs in UTC. `0 12 * * *` is 6:00 AM Central during CDT (summer);
note in the PR that it drifts an hour at DST (use `0 11 * * *` in winter if it
matters). Vercel auto-sends `Authorization: Bearer ${CRON_SECRET}` when
`CRON_SECRET` is set in project env vars, which is why Part A checks exactly that.

## Env vars to document (add to both .env.example files)

```
CRON_SECRET=                # Vercel injects this as a Bearer token on cron calls
SUPABASE_SERVICE_ROLE_KEY=  # server-only, bypasses RLS, cron use only
OWNER_USER_ID=              # the auth.users id of Malcolm's account
OWNER_EMAIL=                # where the daily plan is sent
RESEND_API_KEY=             # optional; unset = plan is logged, not emailed
ANTHROPIC_CRON_MODEL=claude-haiku-4-5
```

## Acceptance criteria

1. `npm run build` passes.
2. Call the route locally with the correct Bearer header and an `OWNER_USER_ID`
   that has a few tasks; confirm a plan comes back in Malcolm's voice (no emoji,
   no dash punctuation).
3. Call it with a wrong/absent header; confirm 401.
4. With `RESEND_API_KEY` unset, confirm it returns `emailed: false` and logs the
   plan rather than crashing.
5. If the DB has no tasks today, confirm it still returns a usable plan built
   from weekly defaults (G1: the habit is the product, never send nothing).
6. Run `.claude/skills/ship-check/`. Pay special attention to items 3, 4, 5
   (auth on the route, no client-supplied identity, service-role key contained).
