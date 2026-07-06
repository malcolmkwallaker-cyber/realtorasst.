---
name: market-copy
description: Rewrite or create high-converting website copy — headlines, value propositions, service/product pages, and CTAs — grounded in the business's actual offer and audience. Usage: /market-copy <website-url or page-url> [what to write]
---

# Website Copy Generator

Write conversion-focused copy that sounds like the business, not like AI.

**Input:** a URL (site or specific page) and optionally what to write (e.g. "homepage rewrite", "service page for Botox", "pricing page"). If the scope is unclear, default to a homepage rewrite.

## Steps

1. **Research first.** Fetch the target page(s), identify: offer, audience, current headline, proof available (real testimonials/numbers on the site), and brand voice. Check 1–2 competitors for positioning context.
2. **Diagnose** the current copy in 3–5 bullets: what's vague, what's buried, what's missing.
3. **Write the new copy** with this structure (adapt per page type):
   - **Headline** — outcome + specificity (offer 3 options: safe, bold, curiosity)
   - **Subheadline** — who it's for and the mechanism
   - **Primary CTA** — specific action language
   - **Body sections** — problem → solution → how it works → proof → offer → FAQ
   - **Microcopy** — button labels, form labels, risk reversal near CTAs
4. **Ground every claim** in what the site actually supports. Use `[PLACEHOLDER: …]` for any number or testimonial the business must supply — never invent stats or reviews.

## Output

Save to `marketing-reports/<domain>/copy-<page>-<date>.md` and show in chat:
- Before/after for the headline and primary CTA
- The full new page copy, structured with section labels the developer/designer can follow
- A short "why this works" note per major section (1 line each)
