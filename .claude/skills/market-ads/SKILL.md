---
name: market-ads
description: Generate paid ad campaigns — Google Search and Meta (Facebook/Instagram) ad copy, audience angles, and campaign structure — for a business's offer. Usage: /market-ads <website-url> [platform] [offer]
---

# Paid Ads Generator

Create ready-to-launch ad copy and a sane starter campaign structure.

**Input:** website URL, optional platform (`google`, `meta`, or both — default both), optional offer to promote. If the site has multiple offers, pick the strongest entry offer and say why.

## Steps

1. **Research:** fetch the site; identify offer, audience, pricing (only if published), proof, and landing page quality. Search competitors' positioning for angle ideas. If the landing page is weak, flag it — ads amplify whatever page they hit (point to `/market-landing`).
2. **Angles:** develop 3 distinct angles (e.g. pain-relief, aspiration, social proof, offer-led). One line each on who it targets and why it should work.

## Google Search ads

- **Keyword groups:** 3 tight ad groups (money terms, "near me"/local terms if applicable, competitor/comparison terms) with ~8 keywords each and suggested match types plus 5 negative keywords.
- **Ads:** per ad group, 1 responsive search ad — 10 headlines (≤30 chars each) and 4 descriptions (≤90 chars each), covering offer, proof, CTA, and location where relevant.

## Meta ads

- Per angle, 2 ad variants: **Primary text** (short + long version), **Headline** (≤40 chars), **Description**, and **Creative direction** (one line: what image/video to use).
- Audience suggestions: 2–3 targeting starting points and a retargeting layer.

## Budget & structure

Suggest a starter daily budget split and a simple test plan (what to compare, what metric decides, when to kill/scale) — qualitative, no invented benchmark numbers.

## Output

Save to `marketing-reports/<domain>/ads-<date>.md` and show everything in chat, organized by platform. Use `[PLACEHOLDER: …]` for prices/claims the business must confirm; keep all claims compliant (no guarantees of results, no before/after health claims where restricted).
