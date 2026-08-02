# Pemberton AI Assistant

## What this is
An AI-powered assistant tool built for Malcolm Wallaker at Pemberton Real Estate (Northern Minnesota). It uses Claude to help generate daily plans, VA (virtual assistant) task handoffs, listing descriptions and social posts, buyer/seller follow-up scripts, recruiting outreach messages, and task checklists.

## Current status
**Prototype — not yet live.** This was built in a single development session and has not been deployed anywhere. Earlier versions of this same idea were built three different ways (a Python version, a Google Apps Script version, and a Next.js version); the Python and Apps Script versions have been removed from this repo to avoid confusion — the Next.js version in `/nextjs` is the one going forward.

## Website / deployment link
None yet. See `nextjs/README.md` for deployment instructions (designed for Vercel).

## Technologies being used
- **Next.js 14** (React framework) with TypeScript
- **Tailwind CSS** for styling
- **Supabase** (hosted database + login system)
- **Anthropic Claude API** for the AI features

## Main folders
- `nextjs/` — the actual application. Everything lives here: pages, components, database setup.
- `.gitkeep` — placeholder, safe to ignore.

## Setup instructions
See `nextjs/README.md` for the full setup guide (installing dependencies, connecting Supabase, adding your Claude API key, running it locally).

## How to make changes
1. Create a new branch (don't edit the main branch directly).
2. Make your changes inside the `nextjs/` folder.
3. Open a pull request so changes can be reviewed before they go live.

## Current priorities
- Decide whether to actually deploy this (currently code-only).
- Confirm this doesn't duplicate work already being planned in the `local-authority-engine` or `steadfast-systems` repos.
- Consider renaming this repository — the trailing period in "realtorasst." is unusual and the tool's real name is "Pemberton AI Assistant."

## Known problems
- Not deployed anywhere yet — this is code, not a live tool.
- No automated tests.

## Privacy warnings
- Never commit real client names, listing addresses, transaction details, or API keys into this repo.
- The `.env.example` files show what secret values are needed — real values belong only in Vercel/hosting environment variables, never in the code itself.

## Who manages this
Malcolm Wallaker (owner). Maintained with the help of AI coding assistants — see `AI-INSTRUCTIONS.md` for the rules those assistants must follow.
