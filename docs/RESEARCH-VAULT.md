# Research Vault

Deep synthesis on the niche, the customers, the competition, and distribution.
Written 2026-07 as a durable reference: facts marked **[verify]** are time-sensitive
and should be re-checked before being used in outward-facing copy; everything else
is structural and changes slowly. A cheaper model can mine this file instead of
re-researching.

## 1. The niche: Northern Minnesota lake-country real estate

- Markets: Grand Rapids, Itasca County, Iron Range (Hibbing, Virginia, Ely, Babbitt,
  Tower), Duluth, Brainerd Lakes, Walker, Aitkin, Orr, Cook. Two distinct businesses
  share one pipeline: **primary homes** (local incomes, modest price points, VA/FHA/
  USDA-heavy financing) and **lake homes/cabins** (discretionary purchases, buyers
  largely from the Twin Cities metro, cash-heavier, seasonal).
- Seasonality is the operating rhythm: lake inventory and buyer traffic peak
  April–September; ice-out to Labor Day is the selling window; winter is the
  prospecting/recruiting/content season. Content calendars and prospecting systems
  should be planned against this curve, not a generic 12-month one.
- Lake property value drivers (use these in listing copy, in this order of pull):
  frontage feet and orientation (west-facing sunsets sell), lake class (recreational
  vs. environmental), water clarity/fishery reputation (walleye lakes command a
  premium), elevation/slope to water, year-round road access, septic compliance,
  and winterization. Square footage matters less than shoreline.
- Common transaction snags worth pre-empting in seller checklists: septic compliance
  inspections, well tests, shoreland zoning/DNR setbacks, tribal land adjacency in
  parts of the region, and appraisal scarcity for unique cabins.
- Buyer psychology: lake buyers are buying a family ritual, not a house. Copy that
  names the ritual (dock mornings, sauna, ice fishing, deer opener) outperforms
  spec sheets. Primary-home buyers are payment shoppers; lead with monthly cost
  framing and local-lender relationships.

## 2. Customer pain and language (for marketing and for the product itself)

Agent's own pains this software exists to remove, in his words, roughly ranked:
1. "I don't have time to write listing descriptions / posts / follow-ups."
2. "Leads go cold because I don't follow up fast enough."
3. "My VA needs everything spelled out before it's actually off my plate."
4. "New agents ask me the same questions every week."
5. "I know I should post content but I never do."

Phrases that recur in this market's *client* language (mine for copy): "up north",
"the cabin", "on the water", "year-round", "4-season", "deeded access", "hunting
land", "shop/pole barn", "close to town", "move-in ready". Avoid coastal vocabulary
("waterfront estate", "beach house") — it reads as out-of-market.

## 3. Competitive landscape (for the product)

What this app actually competes with is **not other AI apps — it's the agent's
existing habit stack**: typing into ChatGPT, Canva templates, and doing nothing.

- **Generic chat (ChatGPT/Claude.ai):** free-ish, but no memory of settings, no
  formatting guarantees, no CRM linkage, retyping context every time. Our edge is
  the settings-personalized system prompt + one-click multi-output + saved history.
- **Template subscriptions (Coffee & Contracts, Agent Crate, ~$50–100/mo) [verify pricing]:**
  pretty but generic; nothing localized to lake country. Our copy names actual lakes.
- **CRM-embedded AI (kvCORE, Follow Up Boss, BoomTown add-ons):** strong at drip
  automation, weak at voice and local specificity; enterprise pricing. If Pemberton
  already pays for one, integrate rather than compete — export/import contacts.
- **Virtual assistant alone:** $800–1500/mo offshore [verify]. This app makes the VA
  2–3x more effective via handoff briefs rather than replacing them.

Positioning in one line: *"The writing and systems layer for a Northern Minnesota
agent — everything comes out sounding like you, referencing your lakes, ready to send."*

## 4. Offer & pricing thinking (if this is ever sold to other agents)

- The buyer is a solo agent or small-team lead doing 15–60 sides/year; $99/mo is
  under the "one closing pays for a decade" threshold and above the toy tier.
- Sell outcomes per module, not AI: "listing marketed in 10 minutes", "no lead goes
  7 days untouched", "your VA runs without you".
- Moat is the localized judgment (this vault + prompts), not the code. Anyone can
  clone the UI; the voice rules and lake-country specifics are the product.
- Prereq before selling: 90 days of Malcolm's own usage data proving retention.

## 5. Distribution & growth channels (for Pemberton's business itself)

Ranked by fit for this market:
1. **Facebook** — the town square of rural MN. Listings, market updates, and
   personality posts. The `content` module's no-hashtag conversational style is
   deliberate for this.
2. **Facebook Marketplace** — under-used by agents, high buyer traffic for sub-$400k
   and land; the app has a dedicated output tab for it.
3. **Video (FB/IG Reels, YouTube)** — walk-throughs and "living up north" content;
   hooks and 60-second scripts are generated per listing.
4. **Email to buyer list** — segmented by price band and lake vs. town; email blast
   tab exists per listing.
5. **Community presence** — sponsorships, school events, lake associations. The app
   supports this indirectly (frees the time).
6. SEO/blog — long game, low priority; blog outlines exist in the content module
   when winter capacity allows.

## 6. Engine economics (why the token strategy is what it is)

- Typical generation: ~600 input + ~1500 output tokens. On `claude-sonnet-4-6`
  ($3/$15 per MTok) that's ~$0.025; on `claude-haiku-4-5` ($1/$5) ~$0.008.
  At heavy personal use (~30 generations/day) Sonnet costs ~$23/mo, Haiku ~$7/mo.
- Conclusion: cost is not the constraint at single-user scale; quality is. Default
  Sonnet, flip `ANTHROPIC_MODEL=claude-haiku-4-5` for bulk/batch jobs (cron plans,
  prospecting batches) where outputs are short and structured. Revisit only if this
  becomes multi-tenant.
- Prices above are API list prices as of mid-2026 **[verify before quoting]**.
