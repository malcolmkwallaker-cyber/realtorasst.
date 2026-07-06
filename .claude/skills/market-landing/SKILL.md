---
name: market-landing
description: Audit an existing landing page section-by-section or generate a complete high-converting landing page blueprint (structure + full copy) for an offer. Usage: /market-landing <page-url or website-url> [offer]
---

# Landing Page Auditor & Builder

Two modes — detect from the input:

- **Audit mode:** the URL points to an existing landing/offer page → score and fix it.
- **Build mode:** the user asks for a new page (or no good page exists for the offer) → produce a complete blueprint with copy.

## Audit mode

1. Fetch the page. Walk it top to bottom, scoring each section:
   - Above the fold: headline clarity, subhead, CTA, hero relevance, load-killers
   - Offer: specificity, value stack, risk reversal, pricing clarity
   - Proof: testimonials, results, credentials — specific or generic?
   - Flow: objection handling, FAQ, repeated CTAs, mobile-inferable issues
   - Friction: form length, distractions, nav leaks (external links off the funnel)
2. Output: page score /100, section-by-section table (section → issue → fix), and rewritten copy for the 3 weakest sections.

## Build mode

1. Research the offer from the main site + 1–2 competitor landing pages.
2. Deliver a full blueprint, section by section, each with **complete copy** plus a one-line design note:
   1. Hero (headline, subhead, CTA, visual direction)
   2. Problem/agitation
   3. Solution & how it works (3 steps)
   4. Value stack / what's included
   5. Proof (with `[PLACEHOLDER: …]` for real testimonials)
   6. Offer & pricing presentation
   7. Risk reversal / guarantee
   8. FAQ (6–8 real objections)
   9. Final CTA
3. Include: recommended form fields (minimum viable), and a thank-you page note (what to show post-conversion).

## Output

Save to `marketing-reports/<domain>/landing-<date>.md` and present in chat. Never invent testimonials, results, or prices — placeholder anything unverified.
