---
name: market-strategy
description: Assess a business's marketing strategy — positioning, channels, funnel coverage, offer ladder, and growth opportunities — and produce strategic recommendations. Runs standalone or as subagent 5 of /market-audit. Usage: /market-strategy <website-url>
---

# Marketing Strategy Analysis

Zoom out from tactics: evaluate whether this business's overall marketing system is designed to grow, and identify the highest-leverage strategic moves.

**Input:** target URL (plus business type, brand basics, and any findings from other analyses if provided by an orchestrator).

## Analysis checklist

1. **Positioning** — Is the business a commodity ("we do X in Y city") or a distinct choice (niche, mechanism, guarantee, signature offer)? What position is available in this market?
2. **Offer ladder** — Is there a path from free (content/lead magnet/audit) → entry offer → core offer → retention/recurring revenue? Identify missing rungs.
3. **Channel presence** — Which channels are visibly active (SEO, social profiles linked from the site, paid ads detectable, email list, partnerships, review platforms)? Which one channel deserves focus next given the business type?
4. **Funnel coverage** — Top (awareness content), middle (comparison/proof), bottom (conversion pages, remarketing hooks). Where does the funnel leak?
5. **Retention & LTV levers** — Email nurture, loyalty/membership, referral program, review generation loop. For local/service businesses, repeat-visit mechanics matter more than new traffic.
6. **Measurement** — Can this business tell what's working (analytics, call tracking, promo codes)? Strategy without measurement is a finding.

## Scoring rubric (0–100)

- 90+: Distinct positioning, full offer ladder, one dominant channel plus a working funnel and retention loop
- 70–89: Solid core offer but gaps in ladder, funnel, or measurement
- 50–69: Commodity positioning, single-channel dependence, no nurture/retention
- <50: No discernible strategy — brochure site with no system behind it

## Output

**Subagent mode** (called from /market-audit): return exactly —

```
DIMENSION: Strategy
SCORE: <0-100>
FINDINGS:
- [critical|high|medium|low] <title> — <evidence> — <impact>
RECOMMENDATIONS:
- <strategic move, with expected timeframe: quick win / 1-3 months / 3-6 months>
```

**Standalone mode:** present a strategic brief in chat — positioning assessment, the single biggest growth lever, and a 90-day focus recommendation — and offer to save to `marketing-reports/<domain>/strategy-<date>.md`.
