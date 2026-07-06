---
name: market-local
description: Local marketing audit for brick-and-mortar and service-area businesses (med spas, realtors, clinics, restaurants, contractors) — local SEO, Google Business Profile, reviews, and neighborhood-level competition. Usage: /market-local <website-url> [city/area]
---

# Local Marketing Audit

Everything that decides who wins "near me" searches. Use for any business whose customers come from a geographic area — including real estate agents and teams.

**Input:** website URL and optionally the city/service area (otherwise detect it from the site).

## Analysis checklist

1. **Local intent match** — Does the site name its city/neighborhoods in titles, H1s, and copy? Are there dedicated service-area or neighborhood pages?
2. **NAP consistency** — Name, address, phone on the site (footer/contact), clickable tel: links, embedded map.
3. **Google Business Profile signals** — Search the business name + city: does a profile appear, is it claimed-looking (photos, posts, hours), what's the rating and review count vs. nearby competitors?
4. **Reviews engine** — Volume, recency, and rating across Google/Yelp/industry platforms (Zillow/realtor.com for agents). Is there any visible review-generation mechanism? Are reviews showcased on the site?
5. **Local schema** — LocalBusiness/RealEstateAgent JSON-LD, geo meta, opening hours markup.
6. **Directories & citations** — Presence in the directories that matter for this category (search "<category> <city>" and note which aggregators rank — is the business listed?).
7. **Local competition** — Top 3 local rivals from map-pack/organic results: their review counts, offers, and content vs. the target.
8. **Local content & offers** — Neighborhood guides, local FAQs, seasonal/local promotions, community involvement proof.

## Output

Save to `marketing-reports/<domain>/local-audit-<date>.md` and show in chat:
- Local visibility score /100 with rationale
- Findings table (item → status → severity → fix)
- "Own your neighborhood" 30-day plan: review generation loop, GBP optimization steps, 3 local content pieces, and citation cleanup list

Report only observed data — quote actual review counts/ratings you saw in search results, and mark anything unverifiable as such.
