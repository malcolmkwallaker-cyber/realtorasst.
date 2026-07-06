---
name: market-conversion
description: Audit a website's conversion optimization — CTAs, forms, friction, trust signals, offer structure, and follow-up capture. Runs standalone or as subagent 2 of /market-audit. Usage: /market-conversion <website-url>
---

# Conversion Optimization Audit

Evaluate how effectively the website turns visitors into leads, bookings, or sales.

**Input:** target URL (plus business type and key pages if provided by an orchestrator). If standalone, do quick discovery first: fetch homepage, detect business type, find the primary conversion path.

## Analysis checklist

Walk the visitor journey from landing to conversion:

1. **Primary CTA** — Is there one obvious next step above the fold on every key page? Is the CTA specific ("Book a free consult") or vague ("Learn more")?
2. **Conversion paths** — How many clicks from homepage to purchase/booking/contact? Any dead ends or pages with no CTA?
3. **Forms & booking** — Number of fields, unnecessary friction, mobile usability, whether an online booking/scheduling option exists (critical for local/service businesses).
4. **Trust at the point of action** — Reviews, guarantees, security cues, pricing transparency near CTAs. Hidden pricing on high-consideration offers is a finding.
5. **Offer structure** — Is there a low-risk entry offer (free audit, consult, trial, quiz)? Packages/tiers clarity. Flag any pricing inconsistencies between pages as **critical**.
6. **Lead capture & follow-up** — Email capture, lead magnet, exit intent, chat, retargeting pixels visible in page source.
7. **Speed & mobile blockers** — Anything observable that would break conversion on mobile (popups, tiny tap targets, layout issues inferable from markup).

## Scoring rubric (0–100)

- 90+: Single clear CTA everywhere, frictionless path, strong trust at action, entry offer + follow-up capture
- 70–89: Clear CTA but friction (long forms, no booking, weak trust)
- 50–69: Inconsistent CTAs, hidden pricing, no lead capture
- <50: No obvious way to convert, or broken conversion paths

## Output

**Subagent mode** (called from /market-audit): return exactly —

```
DIMENSION: Conversion Optimization
SCORE: <0-100>
FINDINGS:
- [critical|high|medium|low] <title> — <evidence> — <impact>
RECOMMENDATIONS:
- <specific CRO action>
```

**Standalone mode:** present a readable report in chat with the top 5 highest-impact CRO fixes ranked by effort vs. impact, and offer to save it to `marketing-reports/<domain>/conversion-audit-<date>.md`.
