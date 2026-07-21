---
name: add-generator
description: Add a new generator module to the Next.js app (new content type with form, prompts, and output tabs). Use whenever asked to add a new kind of generated output, e.g. "add an open house module".
---

# Add a Generator Module

The app is one repeating pattern; a new module is five small files/edits. Follow in
order. Replace `openhouse` with your module's id throughout.

## 1. Prompt builder — `nextjs/prompts/openhousePrompt.ts`

Copy the shape of `listingPrompt.ts`:

```ts
import type { UserSettings } from '@/types'
import { identity, text, type Inputs, type PromptSpec } from './common'

export function buildOpenhousePrompt(inputs: Inputs, settings: Partial<UserSettings>): PromptSpec[] {
  const { agent, brokerage } = identity(settings)
  const ctx = `...facts from inputs, one per line, every value wrapped in text(inputs.x, 'fallback')...`
  return [
    { id: 'invite', label: 'FB Invite', prompt: `...instruction with length cap and CTA...\n\n${ctx}` },
    // one spec per output tab
  ]
}
```

Rules: use `text()`/`list()` from common.ts for every input (never bare `??`);
follow `.claude/skills/write-realtor-prompts/` for the prompt text itself.

## 2. Register the builder — `nextjs/app/api/generate/route.ts`

Import it and add `openhouse: buildOpenhousePrompt` to `BUILDERS`.

## 3. Type — `nextjs/types/index.ts`

Add `'openhouse'` to the `GeneratorType` union.

## 4. Form component — `nextjs/components/forms/OpenhouseForm.tsx`

Copy an existing form (e.g. `ContentForm.tsx`). It holds local state for inputs and
renders inside `GeneratorShell`, which handles the generate button, loading, errors,
and tabs:

```tsx
<GeneratorShell title="Open Houses" description="..." generatorType="openhouse" promptInput={inputs}>
  {/* Input/Select/Textarea fields bound to state */}
</GeneratorShell>
```

## 5. Page + sidebar

- `nextjs/app/(dashboard)/openhouse/page.tsx` rendering the form (copy an existing page).
- Add `{ href: '/openhouse', label: 'Open Houses', icon: <lucide icon> }` to
  `navItems` in `components/layout/Sidebar.tsx`.

## 6. Verify (do not skip)

1. `cd nextjs && npm run build` — zero type errors.
2. Run dev, generate once with a **completely empty form** — output must still be
   usable (fallbacks working).
3. Generate once with realistic inputs and **read every tab** against the voice
   rules (no emojis, no dash punctuation, no preamble, local references present).
4. Run `.claude/skills/ship-check/`.
