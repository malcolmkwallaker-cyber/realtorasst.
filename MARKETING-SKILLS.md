# AI Marketing Skills for Claude Code

A free AI marketing toolkit that runs inside [Claude Code](https://claude.com/claude-code): 15 slash commands that audit any website's copy, SEO, funnels, and competitors — and generate a client-ready PDF report — from a single prompt. The kind of deliverable marketing agencies charge $5,000–$10,000/month for.

## Install (one command)

From a terminal in the project folder where you want the skills:

```bash
curl -fsSL https://raw.githubusercontent.com/malcolmkwallaker-cyber/realtorasst./claude/real-estate-daily-assistant-GgwfR/install-marketing-skills.sh | bash
```

Or, from a local clone of this repo:

```bash
./install-marketing-skills.sh /path/to/your/project
```

Then start (or restart) Claude Code in that project. Type `/market` and the commands will autocomplete.

**Requirements:** [Claude Code](https://claude.com/claude-code) (CLI or the VS Code extension by Anthropic). The PDF generator uses Python 3 and installs `reportlab` on first run.

## Quick start

```
/market-audit https://yourwebsite.com
```

This launches **five subagents in parallel** — content & messaging, conversion optimization, competitors, technical SEO, and strategy — then synthesizes a scored audit (0–100 with a letter grade), severity-ranked key findings, and a prioritized action plan. Takes a few minutes; approve the web-access permission prompts as they appear.

Then:

```
/market-report-pdf
```

turns the audit into a polished PDF you can send straight to a client.

## All 15 commands

| Command | What it does |
|---|---|
| `/market-audit <url>` | Full marketing audit — 5 parallel agents, scored report |
| `/market-report-pdf` | Client-ready PDF of the latest audit |
| `/market-content <url>` | Content & messaging analysis (value prop, proof, clarity) |
| `/market-conversion <url>` | CRO audit — CTAs, forms, friction, trust, offers |
| `/market-competitors <url>` | Competitor analysis across direct/indirect/aspirational tiers |
| `/market-technical <url>` | Technical SEO — metadata, schema, sitemap, local signals |
| `/market-strategy <url>` | Positioning, offer ladder, channels, 90-day focus |
| `/market-seo <url>` | Deep SEO audit + keyword map + content calendar |
| `/market-local <url>` | Local/"near me" audit — GBP, reviews, citations (great for realtors, med spas, clinics) |
| `/market-funnel <url>` | Funnel mapping — find the leaks, design the fix |
| `/market-landing <url>` | Landing page audit or full page blueprint with copy |
| `/market-copy <url>` | High-converting website copy rewrites |
| `/market-email <url>` | Complete email sequences (welcome, nurture, launch, reviews) |
| `/market-social <url>` | 30-day social calendar + 10 ready-to-post pieces |
| `/market-ads <url>` | Google & Meta ad campaigns — angles, copy, structure |

All reports are saved under `marketing-reports/<domain>/` in your project.

## How it works

Each command is a Claude Code **skill** — a folder in `.claude/skills/` containing a `SKILL.md` file with expert instructions. When you run the slash command, Claude Code follows those instructions: fetching the site, launching subagents where specified, and producing evidence-based deliverables. No coding required.

`/market-audit` orchestrates the five analysis skills as parallel subagents, so a full agency-grade audit completes in minutes. Every finding must cite evidence actually observed on the site — the skills explicitly forbid invented stats, reviews, or pricing.

## Using this to land clients

Run `/market-audit` + `/market-report-pdf` on a local business's website, send them the PDF for free, and offer a call to walk through the critical findings. The report demonstrates competence they can verify (pricing inconsistencies, missing metadata, review gaps) — then the follow-up skills (`/market-copy`, `/market-email`, `/market-ads`, `/market-social`) are how you deliver the retainer work.
