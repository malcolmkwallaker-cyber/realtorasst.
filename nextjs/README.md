# Pemberton AI Assistant

AI-powered real estate assistant for Malcolm Wallaker, Pemberton Real Estate, Northern Minnesota.

## Features

- **Listings** - Generate MLS descriptions, Facebook posts, Instagram captions, email blasts, video scripts, hooks, buyer avatars, and showing instructions
- **Buyers** - First response texts, follow-ups, showing confirmations, buyer agreement explanations, lender referrals
- **Sellers** - CMA follow-ups, listing confirmations, pre-listing checklists, price reduction scripts, expired and FSBO outreach
- **Recruiting** - Cold DMs, cold emails, call scripts, coffee invites, value propositions, partnership emails
- **Content** - Facebook posts, market updates, lake home content, video scripts, blog outlines
- **Tasks** - Task checklists for new buyers, sellers, listings, transactions, open house follow-ups, VA handoffs

## Setup

### 1. Install dependencies

```bash
cd nextjs
npm install
```

### 2. Create environment file

```bash
cp .env.example .env.local
```

Fill in all four values:

```
NEXT_PUBLIC_SUPABASE_URL=       # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # from Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=      # from Supabase project settings
ANTHROPIC_API_KEY=              # from console.anthropic.com
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/migrations/001_initial.sql`
3. Go to Authentication and create your user account (Email/Password)

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### 5. First-time setup

Go to **Settings** and save your info (name, brokerage, markets, VA name, etc). This personalizes every AI output.

## Deploy to Vercel

1. Push the repo to GitHub
2. Import the project in [vercel.com](https://vercel.com)
3. Set the **Root Directory** to `nextjs`
4. Add all four environment variables in Vercel project settings
5. Deploy

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + RLS)
- Anthropic Claude (claude-sonnet-4-6)
