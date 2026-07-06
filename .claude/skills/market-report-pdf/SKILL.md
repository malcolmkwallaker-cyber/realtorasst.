---
name: market-report-pdf
description: Turn a completed marketing audit into a polished, client-ready PDF report with scores, severity-tagged findings, action plan, and competitive landscape. Run after /market-audit. Usage: /market-report-pdf [path-to-audit.md]
---

# Client-Ready PDF Report Generator

Convert the most recent marketing audit into a professional PDF a user can send directly to a client or business owner.

## Steps

1. **Locate the audit.** Use the path from the user's arguments if given; otherwise find the most recently modified `marketing-reports/*/audit-*.md`. If none exists, tell the user to run `/market-audit <url>` first and stop.
2. **Extract report data** from the audit markdown into a JSON file matching the schema below. Write it next to the audit as `report-data.json`. Fill every field from the audit content — do not invent data. Use `date +%Y-%m-%d` for the date if the audit doesn't state one.
3. **Ensure the dependency:** `python3 -c "import reportlab" 2>/dev/null || pip install reportlab` (use `pip3` if `pip` is missing).
4. **Generate the PDF:**
   ```
   python3 .claude/skills/market-report-pdf/scripts/generate_report.py <report-data.json> <output.pdf>
   ```
   Name the output `marketing-reports/<domain>/Marketing-Audit-<BusinessName>-<date>.pdf` (business name in CamelCase or hyphenated).
5. **Confirm to the user** with the output path and a one-line description of what's inside.

## report-data.json schema

```json
{
  "business_name": "Nob Hill Aesthetics",
  "website": "https://example.com",
  "date": "2026-07-06",
  "overall_score": 64,
  "grade": "C-",
  "executive_summary": "2-4 sentence summary of the state of this business's marketing and the biggest opportunity.",
  "score_breakdown": [
    {"category": "Content & Messaging", "score": 62, "note": "one-line assessment"},
    {"category": "Conversion Optimization", "score": 58, "note": "..."},
    {"category": "SEO & Discoverability", "score": 55, "note": "..."},
    {"category": "Competitive Position", "score": 70, "note": "..."},
    {"category": "Strategy", "score": 66, "note": "..."}
  ],
  "key_findings": [
    {"severity": "critical", "title": "Short finding title", "detail": "Evidence and why it matters."}
  ],
  "action_plan": {
    "quick_wins": ["Fix X immediately", "..."],
    "medium_term": ["1-3 month project", "..."],
    "strategic": ["3-6 month investment", "..."]
  },
  "competitors": [
    {"name": "Competitor", "website": "https://...", "tier": "direct",
     "strengths": "...", "pricing": "observed or 'not published'", "social_proof": "..."}
  ],
  "methodology": "Short paragraph explaining how the audit was performed so the client isn't confused."
}
```

`severity` must be one of `critical`, `high`, `medium`, `low`. Order `key_findings` most severe first. Omit `competitors` only if the audit had none.
