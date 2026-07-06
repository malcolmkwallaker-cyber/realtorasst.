---
name: market-audit
description: Run a complete marketing audit of any website — content, conversion, competitors, technical SEO, and strategy — using 5 parallel subagents, then synthesize a scored, client-ready report. Use when asked to audit a website's marketing. Usage: /market-audit <website-url>
---

# Full Marketing Audit

You are running a professional-grade marketing audit, the kind an agency charges $5,000–$10,000 for. The deliverable must be evidence-based, specific, and client-ready.

**Input:** the target website URL from the user's arguments. If no URL was provided, ask for one before doing anything else. Normalize it (add `https://` if missing) and derive `<domain>` (e.g. `example.com`).

## Phase 1 — Discovery & Pre-Analysis

Before launching subagents, perform these discovery steps yourself:

1. **Fetch the target URL** (homepage). Note the page title, headline, primary offer, and main calls-to-action.
2. **Detect the business type.** Classify as one of: `saas`, `ecommerce`, `local-business`, `real-estate`, `professional-services`, `creator/course`, `agency`, `other`. This changes what "good" looks like for every downstream analysis.
3. **Identify key pages.** Try `/sitemap.xml` and `/robots.txt`, and scan the homepage navigation. Shortlist up to 8 key pages: pricing/services, about, contact/booking, blog, testimonials/case studies, and any top product/landing pages.
4. **Capture brand basics:** business name, what they sell, who they sell to, geographic focus (if local), and the primary conversion action (buy, book, call, form).

If the homepage cannot be fetched at all, stop and tell the user — do not fabricate an audit.

## Phase 2 — Parallel Subagent Execution

Launch **five subagents simultaneously** (all Task calls in a single message so they run in parallel). Each subagent receives: the URL, business type, key page list, and brand basics from Phase 1.

| # | Subagent | Instructions to follow | Focus |
|---|----------|------------------------|-------|
| 1 | market-content | `.claude/skills/market-content/SKILL.md` | Content & messaging |
| 2 | market-conversion | `.claude/skills/market-conversion/SKILL.md` | Conversion optimization |
| 3 | market-competitors | `.claude/skills/market-competitors/SKILL.md` | Competitive landscape |
| 4 | market-technical | `.claude/skills/market-technical/SKILL.md` | Technical SEO & discoverability |
| 5 | market-strategy | `.claude/skills/market-strategy/SKILL.md` | Positioning & growth strategy |

In each subagent prompt, instruct it to read its skill file, run the analysis in "subagent mode", and return **structured findings**:

```
DIMENSION: <name>
SCORE: <0-100>
FINDINGS:
- [critical|high|medium|low] <title> — <evidence: exact page/quote/number> — <why it matters>
RECOMMENDATIONS:
- <specific action>
```

## Phase 3 — Synthesis & Scoring

When all five subagents complete:

1. **Overall score /100**, weighted: Content & Messaging 25%, Conversion Optimization 25%, SEO & Discoverability 20%, Competitive Position 15%, Strategy 15%.
2. **Letter grade:** A ≥ 90, B ≥ 80, C ≥ 65, D ≥ 50, F < 50 (use +/− within bands).
3. **Merge and dedupe findings.** Rank by severity: Critical → High → Medium → Low. Every finding must cite concrete evidence from the site (a page, a quote, a number, a missing element). Never invent pricing, traffic, or review counts.
4. **Prioritized action plan** in three horizons:
   - **Quick wins (this week)** — low effort, high impact fixes
   - **Medium-term (1–3 months)** — content, CRO, and SEO projects
   - **Strategic (3–6 months)** — positioning, funnel, and channel investments

## Phase 4 — Report & Summary

1. Get today's date with `date +%Y-%m-%d`.
2. Write the full report to `marketing-reports/<domain>/audit-<date>.md` with these sections: Executive Summary, Overall Score & Grade, Score Breakdown (table), Key Findings (grouped by severity), Prioritized Action Plan, Competitive Landscape, Methodology.
3. Display a concise summary in chat: overall score, grade, top 3 findings, and the report path.
4. End by suggesting: "Run `/market-report-pdf` to generate the client-ready PDF version."

## Rules

- Evidence over opinion: each finding names where on the site it was observed.
- If a page or data source is unreachable, say so and score only what is observable.
- Keep the tone professional and constructive — this report may be sent directly to a business owner.
