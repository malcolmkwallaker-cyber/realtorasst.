---
name: market-email
description: Generate complete email sequences — welcome, nurture, sales/launch, re-engagement, or review-request — tailored to a business's offer and audience. Usage: /market-email <website-url> [sequence type]
---

# Email Sequence Generator

Create a ready-to-load email sequence for the business.

**Input:** website URL plus optional sequence type. If type isn't specified, recommend one based on the business (e.g. welcome/nurture for service businesses, abandoned-cart for e-commerce, past-client re-engagement for real estate) and confirm before writing.

## Sequence types

- **welcome** — 5 emails: deliver lead magnet → story/credibility → best content → soft offer → direct offer
- **nurture** — 6 emails over ~3 weeks: value, proof, objection handling, offer
- **sales/launch** — 5–7 emails: announce → benefits → proof → objections/FAQ → urgency → last call
- **re-engagement** — 3–4 emails to a cold list: pattern-interrupt → value → offer/breakup
- **review-request** — 3 emails post-purchase/service asking for a Google/Yelp review (critical for local businesses)

## Steps

1. Fetch the website; extract offer, audience, voice, and any real proof points to reference.
2. Confirm/choose sequence type and goal (reply, booking, purchase, review).
3. Write each email with:
   - **Subject line** (plus 1 alternate) and preview text
   - Body: 80–200 words, one idea, one CTA, conversational and skimmable
   - Send timing (e.g. Day 0, Day 2, Day 5)
4. Use `[FIRST_NAME]`-style merge tags and `[PLACEHOLDER: …]` for facts the business must supply. Never invent testimonials, stats, or discounts.

## Output

Save to `marketing-reports/<domain>/email-<type>-<date>.md` and show the full sequence in chat with a summary table (email #, subject, goal, timing) at the top.
