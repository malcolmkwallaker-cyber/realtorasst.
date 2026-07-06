---
name: market-competitors
description: Identify and analyze a business's competitors across three tiers (direct, indirect, aspirational) — positioning, pricing, social proof, and content. Runs standalone or as subagent 3 of /market-audit. Usage: /market-competitors <website-url>
---

# Competitor Analysis

Map the competitive landscape for the target business and extract what competitors do better or worse.

**Input:** target URL (plus business type, location, and brand basics if provided by an orchestrator). If standalone, do quick discovery first: fetch the homepage, detect business type, and note the geographic market if it's a local business.

## Phase 1 — Identify competitors across three tiers

- **Direct competitors** — same offer, same audience, same market (for local businesses: same city/area).
- **Indirect competitors** — different offer solving the same problem (e.g. DIY tools vs. a service).
- **Aspirational competitors** — best-in-class players the business can learn from, even if larger or in another market.

**Discovery methods** (use several):
1. Web search: "<category> in <city>", "<brand> alternatives", "best <category> for <audience>"
2. Search the business's own primary keywords and see who ranks
3. Comparison/review platforms relevant to the business type (Google Maps/Yelp for local, G2/Capterra for SaaS, marketplaces for e-commerce)
4. Any competitors the site itself names

Select 3–5 competitors that are real, verifiable businesses. Only include competitors you actually found via search or fetching — never invent names, reviews, or prices.

## Phase 2 — Collect data per competitor

For each: fetch their site and/or read search snippets. Capture what is observable:
- Positioning & headline promise
- Offer/pricing visibility (exact numbers only if published)
- Social proof (review counts, ratings, testimonials, case studies)
- Content & SEO activity (blog recency, service pages, local pages)
- Notable strengths and exploitable weaknesses

## Phase 3 — Analysis framework

1. **Comparison table** — target vs. competitors on the dimensions above.
2. **Gaps** — what competitors have that the target lacks (threats).
3. **Openings** — what the target could own that competitors neglect (opportunities).
4. **Competitive score (0–100)** for the target: 90+ clearly differentiated and out-marketing peers; 70–89 competitive but not distinct; 50–69 behind on proof/content/visibility; <50 outclassed on most dimensions.

## Output

**Subagent mode** (called from /market-audit): return exactly —

```
DIMENSION: Competitive Position
SCORE: <0-100>
COMPETITORS:
- <name> | <website> | <tier> | strengths: <...> | pricing: <observed or "not published"> | social proof: <observed>
FINDINGS:
- [critical|high|medium|low] <title> — <evidence> — <impact>
RECOMMENDATIONS:
- <specific competitive move>
```

**Standalone mode:** present the comparison table and analysis in chat and offer to save to `marketing-reports/<domain>/competitor-analysis-<date>.md`.
