---
name: write-realtor-prompts
description: Standards for writing or editing any prompt in this app (prompt builders, system prompts, cron prompts). Use before touching anything in nextjs/prompts/ or lib/anthropic.ts.
---

# Writing Prompts in Malcolm's Voice

The product IS these prompts. The code is scaffolding around them.

## The winning prompt shape (use it every time)

```
<What to write, in one sentence.> <Hard length cap.> <Structure/ordering.>
<The one thing to lead with.> <Call to action naming ${agent} at ${brokerage}.>

${ctx}   ← facts block, one fact per line, fallbacks for everything
```

Short instruction + explicit structure + facts block. No role-play preamble
("You are a world-class copywriter"), no examples longer than the output, no
chained reasoning requests. The system prompt already carries persona and voice.

## Voice rules (absolute — the system prompt enforces them; never fight it)

1. No emojis anywhere.
2. No dashes as punctuation; commas, semicolons, periods.
3. Copy-paste ready: no preamble, no trailing notes or caveats.
4. Weave in agent name, brokerage, and local market references where natural.
5. Tone: friendly, local, confident, clear; slightly humorous only where it fits.

## Craft rules learned building this app

- **Lead with the distinctive, not the address.** For lake property that's frontage,
  lake name, orientation, access (see docs/RESEARCH-VAULT.md §1 for the ranked
  value drivers and §2 for vocabulary to use/avoid).
- **One prompt = one artifact.** Never ask for "a post and also 3 hooks" in one
  spec; split into separate `PromptSpec`s (tabs are cheap, mixed outputs aren't
  copy-paste ready).
- **Give a length cap in words or sentences, always.** Uncapped prompts drift long
  and get truncated by max_tokens.
- **Placeholders in [BRACKETS]** for anything the agent must fill before sending
  (lockbox codes, times, names).
- **Audience in one clause** ("Target buyers actively looking in this price range
  and area") beats a paragraph of persona description.
- **VA handoffs**: address Dan directly, define what done looks like, include
  escalation triggers. The daily-planner and VA prompts in `main.py` are the
  reference implementations of tone.

## Editing an existing prompt

1. Save one real generation with fixed inputs (the "before").
2. Make the edit.
3. Regenerate with identical inputs; diff by reading, judged against this file.
4. Ship only if strictly better; otherwise revert. Never stack two speculative
   edits in one change.

## Engine portability

Prompts here must work on cheaper engines too (that's the token strategy). Keep
them instruction-dense and example-light; if a prompt only works on the expensive
model, it's over-clever — simplify the instruction rather than upgrading the engine.
