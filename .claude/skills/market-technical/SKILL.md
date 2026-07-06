---
name: market-technical
description: Audit a website's technical SEO and discoverability — metadata, structured data, sitemap, indexability, performance signals, and local SEO. Runs standalone or as subagent 4 of /market-audit. Usage: /market-technical <website-url>
---

# Technical SEO & Discoverability Audit

Evaluate how findable the website is in search and how sound its technical marketing foundation is. Everything here must come from actually fetching pages and files — report what is present or missing, never assume.

**Input:** target URL (plus business type and key pages if provided by an orchestrator).

## Analysis checklist

1. **Metadata** — For homepage + key pages: `<title>` quality (length, keyword, uniqueness) and `<meta name="description">`. Missing descriptions across the site is a **critical** finding (Google auto-generates snippets, hurting click-through).
2. **Structured data** — JSON-LD/schema markup: Organization, LocalBusiness, Product, FAQ, Review as appropriate for the business type. Note what exists vs. what's missing.
3. **Indexability** — `robots.txt` (anything important blocked?), `sitemap.xml` (present, referenced, fresh?), canonical tags, obvious noindex mistakes.
4. **Site architecture** — URL structure, heading hierarchy (one H1 per page), internal linking to key money pages, orphaned key pages.
5. **Performance & mobile signals** — Page weight indicators observable from HTML (render-blocking scripts, uncompressed images by extension/size hints), viewport meta tag, obvious mobile issues.
6. **Local SEO** (local businesses / real estate) — NAP (name, address, phone) present and consistent, embedded map, city/service-area pages, LocalBusiness schema, Google Business Profile link.
7. **Analytics & pixels** — Presence of GA4/GTM, Meta pixel, or other measurement (a business that can't measure can't optimize).
8. **Basics** — HTTPS, www/non-www redirect, 404 handling, favicon, OG/social share tags.

## Scoring rubric (0–100)

- 90+: Complete metadata, schema, sitemap, analytics, fast/mobile-sound, strong local signals where relevant
- 70–89: Fundamentals present but gaps in schema/descriptions/local
- 50–69: Multiple missing fundamentals (metadata, sitemap, analytics)
- <50: Site is effectively invisible to search or has blocking technical errors

## Output

**Subagent mode** (called from /market-audit): return exactly —

```
DIMENSION: SEO & Discoverability
SCORE: <0-100>
FINDINGS:
- [critical|high|medium|low] <title> — <evidence: file/tag checked> — <impact>
RECOMMENDATIONS:
- <specific technical fix>
```

**Standalone mode:** present a readable technical audit in chat with a "fix first" list ordered by SEO impact, and offer to save to `marketing-reports/<domain>/technical-seo-<date>.md`.
