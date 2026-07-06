---
name: market-funnel
description: Map and audit a business's entire marketing funnel — traffic sources through conversion to retention — find the leaks, and design the fixed funnel. Usage: /market-funnel <website-url>
---

# Funnel Analysis & Design

Diagnose where the business loses people between "never heard of you" and "paying repeat customer," then design the corrected funnel.

**Input:** target website URL.

## Steps

1. **Map the current funnel** from what's observable:
   - **Traffic:** which channels visibly feed the site (search presence, social links, ads detectable, directories/reviews)
   - **Capture:** lead magnets, forms, booking, chat — what's offered in exchange for contact info?
   - **Nurture:** email signup present? Any visible follow-up mechanism?
   - **Convert:** primary conversion action and the path to it
   - **Retain/refer:** memberships, packages, review requests, referral incentives
2. **Identify the leaks.** For each stage, state the leak, the evidence, and severity (critical/high/medium/low). Common: traffic with no capture, capture with no nurture, one-shot sales with no retention loop.
3. **Design the fixed funnel.** A stage-by-stage blueprint tailored to the business type, each stage with: the asset needed (page, lead magnet, sequence, automation), and which skill builds it (`/market-landing`, `/market-email`, `/market-ads`, `/market-social`).
4. **Prioritize:** the single biggest leak to fix first and the expected effect, then a build order for the rest.

## Output

Save to `marketing-reports/<domain>/funnel-<date>.md` and show in chat:
- Current funnel diagram (text/mermaid), leaks annotated
- Leak table (stage → leak → evidence → severity)
- Fixed funnel blueprint with build order and skill references
