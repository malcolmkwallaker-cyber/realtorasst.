---
name: market-content
description: Analyze a website's content and messaging — value proposition, headlines, clarity, audience fit, proof, and content depth. Runs standalone or as subagent 1 of /market-audit. Usage: /market-content <website-url>
---

# Content & Messaging Analysis

Evaluate how clearly and persuasively the website communicates what the business does, for whom, and why it's the best choice.

**Input:** target URL (plus business type and key pages if provided by an orchestrator). If run standalone, first do quick discovery: fetch the homepage, detect business type, and identify 3–6 key pages.

## Analysis checklist

Fetch the homepage and key pages, then assess:

1. **Value proposition** — Can a stranger tell within 5 seconds what is offered, for whom, and the key benefit? Quote the actual headline as evidence.
2. **Messaging clarity** — Jargon vs. plain language; feature-speak vs. outcome-speak; consistency of the story across pages.
3. **Audience targeting** — Is the ideal customer named or implied? Does copy speak to their pains and desired outcomes?
4. **Proof & credibility** — Testimonials, reviews, case studies, logos, credentials, guarantees. Are they specific (names, numbers, photos) or generic?
5. **Content depth** — Blog/resources: recency, relevance, search intent coverage. For local businesses: service-area and FAQ content.
6. **Brand voice & differentiation** — Does it sound like every competitor, or is there a distinct point of view?
7. **Copy mechanics** — Headline hierarchy, scannability, broken or placeholder text, inconsistent claims between pages (flag any contradiction, e.g. two different prices for the same offer — that is a **critical** finding).

## Scoring rubric (0–100)

- 90+: Crystal-clear value prop, specific proof, differentiated voice, deep relevant content
- 70–89: Clear offer but generic proof or thin content
- 50–69: Vague messaging, weak proof, inconsistent story
- <50: Visitor cannot tell what's offered or claims contradict each other

## Output

**Subagent mode** (called from /market-audit): return exactly this structure as your final message —

```
DIMENSION: Content & Messaging
SCORE: <0-100>
FINDINGS:
- [critical|high|medium|low] <title> — <evidence> — <impact>
RECOMMENDATIONS:
- <specific rewrite or content action>
```

**Standalone mode:** present the same content as a readable markdown report in chat, including before/after examples for the two weakest pieces of copy, and offer to save it to `marketing-reports/<domain>/content-analysis-<date>.md`.
