---
name: how-fable-thinks
description: The decision patterns used to build and steer this product. Load this before making any non-trivial judgment call in this repo — ranking work, designing a feature, evaluating options, or deciding when something is done.
---

# How Fable Thinks (for this repo)

These are the reasoning patterns behind CLAUDE.md, the roadmap, and the goals.
Apply them and you will make the same calls a frontier model would.

## 1. How to break down a problem

- **Find the constraint first.** Ask "what is actually scarce here?" In this
  business it's the agent's time, not money, not compute, not features. Every
  breakdown starts by expressing the problem in units of the constraint
  (minutes/week returned).
- **Reduce to the repeating pattern.** Before building anything, find the shape the
  codebase already repeats (here: form → prompt builder → generate → tabs) and
  express the new thing as an instance of it. If it can't be expressed that way,
  question the feature before questioning the pattern.
- **Separate the one-time from the recurring.** One-time work (deploy, migration)
  gets done crudely and immediately. Recurring work (prompts, checklists, cadences)
  gets a written system, because systems compound and heroics don't.

## 2. How to evaluate options

Score against, in order:
1. **Frequency × friction removed** — a daily 3-minute save beats a monthly hour.
2. **Compounding** — does it make the *next* feature cheaper (data captured,
   pattern established) or is it a dead end?
3. **Reversibility** — prefer moves that are cheap to undo; spend deliberation
   only on the irreversible ones (schema, auth, public voice).
4. **Maintenance tax** — every integration and dependency is a recurring cost;
   the default answer to "should we integrate X" is no until usage proves need.

Tie-breaker: pick the option a tired person will still use in week 6.

## 3. How trade-offs get made here (worked examples)

- *Quality vs. cost of tokens:* cost is negligible at this scale, so quality wins;
  but for structured bulk jobs the cheap engine is genuinely equivalent, so it wins
  there. The trade-off is per-task-shape, not global. (See CLAUDE.md cost policy.)
- *More features vs. deeper wiring:* depth wins until the loop closes (data in →
  generation → data back). Width is marketing; depth is retention.
- *Automation vs. control:* automate generation and scheduling freely; never
  automate the *send* of a client-facing message. The signature stays human.
- *Three codebases vs. one:* consolidation wins even though it deletes working
  code. Optionality that splits attention is a cost, not an asset.

## 4. How to check work

- **Generate and read the actual output.** Type checks prove plumbing; only reading
  a real generation proves the product. One real listing through the pipeline is
  worth fifty unit tests here.
- **Check against the voice rules mechanically**: search output for emojis and
  " - " / "—" punctuation; scan first line for preamble.
- **Ask "what would break silently?"** In this stack the silent failures are: RLS
  missing (data leak), empty-string inputs passing `??` (blank prompt lines), and
  client-supplied settings (personalization spoofing). Check those three every time.
- **Prefer the checklist to memory.** That's what `.claude/skills/ship-check/` is.

## 5. Templates

**Feature brief (fill before building anything):**
```
Problem (in minutes/week): ...
Who does it now, how: ...
Proposed system: ...
Frequency × friction score: ...
What data does it capture for later: ...
What it will NOT do (guardrails): ...
Done means: ...
```

**Decision record (append to the relevant doc when a call is made):**
```
Decision: ...
Options considered: ...
Ranked by (constraint): ...
Reversible? ...
Revisit when: ...
```

## 6. Meta-rule

When instructions here conflict with a fresh clever idea, the instructions win
until the idea is written down, scored against §2, and merged as an edit to these
files. That's not bureaucracy; it's how the judgment stays extracted.
