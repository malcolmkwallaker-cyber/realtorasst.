---
name: market-seo
description: Full SEO audit and keyword plan for a website — on-page, content gaps, keyword opportunities, and a prioritized SEO roadmap. Deeper than the technical pass in /market-audit. Usage: /market-seo <website-url>
---

# SEO Audit & Keyword Plan

Produce an actionable SEO growth plan, not just a defect list.

**Input:** target URL. Do quick discovery first: fetch homepage, detect business type, list key pages, and fetch `sitemap.xml`.

## Steps

1. **On-page audit** of homepage + up to 6 key pages: titles, meta descriptions, H1s, keyword focus per page (or lack of one), image alt text, internal links.
2. **Keyword research** via web search: what does this business want to rank for? Build a list of 15–25 target keywords across:
   - Money keywords (buy/book intent, includes "near me"/city terms for local businesses)
   - Comparison keywords ("best X", "X vs Y", "X alternatives")
   - Informational keywords (questions the ideal customer asks)
   For each: rough intent, difficulty guess (based on who currently ranks), and which existing or new page should target it.
3. **Content gap analysis:** search 5–8 of those keywords and note who ranks; identify topics competitors cover that the target doesn't.
4. **Quick technical pass:** sitemap, robots, schema, obvious speed issues (summary level — point to `/market-technical` for depth).

## Output

A markdown report saved to `marketing-reports/<domain>/seo-plan-<date>.md` and summarized in chat:

- SEO score /100 with one-paragraph rationale
- On-page fixes table (page → issue → fix)
- Keyword map table (keyword → intent → target page → priority)
- Content calendar: 8 article/page ideas ordered by impact, each with a working title and target keyword
- 30/60/90-day SEO roadmap

Never fabricate search volumes or rankings — describe opportunity qualitatively based on what you actually observed in search results.
