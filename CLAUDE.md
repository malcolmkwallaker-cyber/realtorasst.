# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repo contains three parallel implementations of the same real estate AI assistant (Pemberton AI Assistant for Malcolm Wallaker, Pemberton Real Estate, Northern Minnesota):

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `main.py` + `static/` | Python/FastAPI + vanilla JS | Standalone server version |
| `gas/` | Google Apps Script | Deployable as a Google Workspace web app |
| `nextjs/` | Next.js 14 + Supabase | Primary production app |

The Next.js app is the main product. The Python and GAS versions are functionally equivalent but simpler.

---

## Next.js App (Primary)

### Commands

All commands run from the `nextjs/` directory:

```bash
cd nextjs
npm install        # install dependencies
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

### Environment Setup

```bash
cp nextjs/.env.example nextjs/.env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings
- `ANTHROPIC_API_KEY` — from console.anthropic.com

Initialize the database by running `nextjs/supabase/migrations/001_initial.sql` in the Supabase SQL editor, then create a user via Supabase Authentication (Email/Password).

---

## Python Backend

```bash
cp .env.example .env   # add ANTHROPIC_API_KEY
./run.sh               # installs deps and starts uvicorn on port 8000
```

Or manually: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

---

## Google Apps Script

Deploy via `clasp` from the `gas/` directory. Set `ANTHROPIC_API_KEY` in GAS Script Properties (not `.env`). See the setup comments at the top of `gas/Code.gs`.

---

## Architecture: Next.js App

### Request Flow

Every AI generation goes through a single API route:

```
Form page → GeneratorShell → POST /api/generate → prompt builder → Claude API (parallel) → OutputCard tabs
```

1. **Form page** (`app/(dashboard)/listings/page.tsx`, etc.) renders `<GeneratorShell>` with a form component as children and holds `outputTabs` state.
2. **`GeneratorShell`** (`components/generators/GeneratorShell.tsx`) owns the submit button, calls `/api/generate`, and renders the returned output tabs.
3. **`/api/generate`** (`app/api/generate/route.ts`) dispatches to a prompt builder keyed on `type`, runs all prompts in `Promise.all`, returns `{outputs: [{id, label, content}]}`.
4. **Prompt builders** (`prompts/*.ts`) each export a `buildXxxPrompt(inputs, settings)` function returning an array of `{id, label, prompt}` objects — one per output tab.
5. **`OutputCard`** saves each generated result to the `generated_content` Supabase table automatically.

### Prompt System Rules

The system prompt lives in `lib/anthropic.ts` (`REAL_ESTATE_SYSTEM`). All generated text must follow these rules — enforce them in any new prompts:
- No emojis
- No dashes as punctuation (use commas, semicolons, or periods)
- Output must be copy-paste ready with no preamble or caveats
- Reference Malcolm's name, Pemberton Real Estate, and Northern Minnesota where natural

### Adding a New Generator

1. Create `prompts/myTypePrompt.ts` exporting `buildMyTypePrompt(inputs, settings)` returning `{id, label, prompt}[]`
2. Add the key to the `BUILDERS` map in `app/api/generate/route.ts`
3. Add `'mytype'` to the `GeneratorType` union in `types/index.ts`
4. Create `app/(dashboard)/mytype/page.tsx` using `GeneratorShell` + a form component
5. Add the nav link to `components/layout/Sidebar.tsx`

### Auth & Middleware

Supabase session is managed in middleware (`middleware.ts`). All non-auth, non-API routes redirect to `/login` if unauthenticated. The dashboard layout (`app/(dashboard)/layout.tsx`) fetches `user_settings` server-side and passes them down to `DashboardLayout`.

Settings are also available client-side via `useSettings()` hook (`hooks/useSettings.ts`), which queries the `user_settings` table directly.

### Database Schema

All tables use Row Level Security with `auth.uid() = user_id`. Tables:
- `contacts` — buyers, sellers, recruits, referral partners
- `properties` — listings with waterfront/lake fields for Northern MN market
- `tasks` — linked to contacts and properties, with priority levels
- `conversations` — inbound/outbound messages by channel (email, text, call, social_dm)
- `generated_content` — archived AI outputs with `content_type`, `prompt_input` JSONB, and optional contact/property links
- `user_settings` — per-user personalization (agent name, brokerage, markets, VA name, preferred lenders)

### Supabase Clients

- **Server** (`lib/supabase/server.ts`): use in Server Components and API routes
- **Client** (`lib/supabase/client.ts`): use in `'use client'` components

### Vercel Deployment

Set root directory to `nextjs` and add all four env vars. The `@anthropic-ai/sdk` package is listed under `serverComponentsExternalPackages` in `next.config.ts` to avoid bundling it client-side.
