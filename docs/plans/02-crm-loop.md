# Plan 2 — Close the CRM Loop (property/contact picker + generation history)

Implements Roadmap move #2. Read `CLAUDE.md` and `docs/ROADMAP.md` §2 first for
the why; this file is the exact how. Follow `.claude/skills/add-generator/` and
`.claude/skills/ship-check/` conventions throughout — do not invent new patterns.

## Goal

Eliminate re-typing property/contact details on every generation, and make every
generated output land back on the CRM record it came from.

## Part A — Property picker on the Listings form

**File:** `nextjs/components/forms/ListingForm.tsx`

1. On mount, fetch the signed-in user's properties:
   ```ts
   const supabase = createClient()
   const { data: properties } = await supabase
     .from('properties')
     .select('id, address, city, list_price, property_type, beds, baths, square_feet, acres, lake_name, waterfront, key_features, description')
     .order('created_at', { ascending: false })
   ```
   (Client-side Supabase call is fine here — RLS already scopes to the signed-in
   user; this is read-only data for the form, not a security-sensitive path.)
2. Add a `Select` above the existing fields: "Load from saved property" with
   options `${p.address}, ${p.city}` plus a blank "New property" default.
3. On selection, copy every matching field into the form's existing local state
   (`address`, `city`, `list_price`, `property_type`, `beds`, `baths`,
   `square_feet`, `acres`, `lake_name`, `waterfront`, `key_features` joined with
   `, `, `description`). Do not change the prompt builder
   (`nextjs/prompts/listingPrompt.ts`) — it already reads from these same input
   names via `promptInput`.
4. Store the selected property's `id` in local state as `relatedPropertyId` and
   pass it to `GeneratorShell`'s `relatedPropertyId` prop (already accepted;
   check `components/generators/GeneratorShell.tsx` to confirm the prop
   plumbing, do not change `GeneratorShell` itself in this part).

## Part B — Contact picker on Buyer and Seller forms

**Files:** `nextjs/components/forms/BuyerForm.tsx`, `nextjs/components/forms/SellerForm.tsx`

Same pattern as Part A:
1. Fetch contacts filtered by type:
   ```ts
   .from('contacts').select('id, first_name, last_name, email, phone, lead_source, market_area, price_range, notes')
     .eq('contact_type', 'buyer')   // or 'seller' in SellerForm
   ```
2. Selector labeled "Load from saved contact"; on select, populate whichever
   local fields the existing form already declares (check each form's current
   `useState` fields before mapping — do not add fields that don't exist).
3. Pass the selected contact's `id` as `relatedContactId` to `GeneratorShell`.

## Part C — Save every generation to `generated_content`

**File:** `nextjs/components/generators/GeneratorShell.tsx`, function `handleGenerate`

After `setOutputTabs(data.outputs)` succeeds, insert one row per output tab:

```ts
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  await supabase.from('generated_content').insert(
    data.outputs.map((o: OutputTab) => ({
      user_id: user.id,
      content_type: `${generatorType}_${o.id}`,
      prompt_input: promptInput,
      output: o.content,
      related_contact_id: relatedContactId ?? null,
      related_property_id: relatedPropertyId ?? null,
    }))
  )
}
```

Fire-and-forget: don't block the UI on it; `console.error` on failure, no toast.
Generation succeeded even if history-save fails. Uses the existing
`generated_content` table; no migration needed (good — migrations are an
escalation trigger per CLAUDE.md).

## Part D — History view

**New files:**
- `nextjs/app/(dashboard)/history/page.tsx` — lists `generated_content` rows for
  the signed-in user, newest first, grouped by day. Each row shows
  `content_type`, a truncated preview of `output` (first ~150 chars), and links
  to the related contact/property if present.
- Add `{ href: '/history', label: 'History', icon: History }` (lucide icon) to
  `navItems` in `nextjs/components/layout/Sidebar.tsx`.

Client component reading via RLS-scoped Supabase client, same pattern as the
picker fetches — no separate API route needed. If you do add a route, it must
check `supabase.auth.getUser()` per CLAUDE.md rule 4.

## Acceptance criteria (ship-check for this plan)

1. `npm run build` — zero type errors.
2. Insert a test property row in Supabase, select it in the Listings form
   picker, confirm all fields populate.
3. Generate once from a picked property; confirm `generated_content` rows
   appear with the correct `related_property_id`.
4. Repeat steps 2-3 for a buyer contact and a seller contact.
5. Visit `/history`; confirm the new rows appear and link back correctly.
6. Run `.claude/skills/ship-check/` in full. Any new hand-written UI strings
   follow the same no-emoji, no-dash-punctuation rules as generated copy.
