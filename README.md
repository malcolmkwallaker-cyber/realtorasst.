# Realtor Assistant — Agentic OS

An AI "operating system" for running a real estate business. Instead of one
chatbot answering one prompt at a time, this is a coordinated team of
specialist agents that share persistent memory, a lead pipeline, and a task
queue — orchestrated by **Mission Control**.

## How it works

```
                        you (chat at /os)
                              │
                        🛰️ Mission Control
                    (routes, delegates, synthesizes)
        ┌─────────┬─────────┼─────────┬─────────┬─────────┐
        🎯        📋        ✍️        📊        🤝        🧭
      Lead     Transaction Content   Market     VA      Daily
     Manager   Coordinator Creator  Analyst  Dispatcher  Coach
        └─────────┴─────────┴────┬────┴─────────┴─────────┘
                                 │
                     shared memory (data/*.json)
              notes · lead pipeline · task queue · activity log
```

- **Mission Control** reads your request plus a live snapshot of OS state,
  delegates to the right specialist(s) with a self-contained brief, chains
  them when needed, and synthesizes one answer.
- **Every agent shares the same memory.** When the Lead Manager adds a lead,
  the Daily Coach sees it in tomorrow's plan. When the Transaction Coordinator
  sets a contingency deadline, it lands in the same task queue the VA
  Dispatcher works from.
- **State is plain JSON** under `data/` (gitignored) — no database needed.

### The agents

| Agent | Owns |
|---|---|
| 🎯 Lead Manager | Lead intake, qualification, follow-up cadence, pipeline reviews |
| 📋 Transaction Coordinator | Contract-to-close checklists, contingency deadlines, party updates |
| ✍️ Content Creator | Listing descriptions, social posts, newsletters (fair-housing aware) |
| 📊 Market Analyst | CMA framing, pricing strategy, consult prep (from data you provide) |
| 🤝 VA Dispatcher | Turns delegation into step-by-step VA handoffs tracked as tasks |
| 🧭 Daily Coach | Time-blocked daily plans from live pipeline + task state, accountability |

## Quickstart

```bash
pip install -r requirements.txt
cp .env.example .env   # add your ANTHROPIC_API_KEY
./run.sh               # or: uvicorn main:app --reload
```

Then open:

- **`http://localhost:8000/os`** — Mission Control (the agentic OS)
- `http://localhost:8000/` — the original one-shot tools (daily plan, VA handoff, how-to guides)

Try messages like:

> "New lead: Sarah Kim from the Oak St open house, pre-approved, wants a 3BR under 600k."
>
> "The Hendersons' offer on 42 Birch was accepted — closing Aug 15, inspection in 7 days. Set everything up."
>
> "Plan my day."

## API

| Endpoint | What it does |
|---|---|
| `POST /api/os/chat` | `{message, agent?, history?}` → run Mission Control (or one specialist directly) |
| `GET /api/os/agents` | The agent roster |
| `GET /api/os/state` | Snapshot: pipeline, task queue, recent agent activity |

Configuration (environment variables):

- `ANTHROPIC_API_KEY` — required
- `AGENTIC_MODEL` — model for all agents (default `claude-sonnet-4-6`)
- `AGENTIC_DATA_DIR` — where OS state is stored (default `./data`)

## Repo layout

- `agentic/` — the OS: `orchestrator.py` (agent loop + delegation), `registry.py` (agent roster/prompts), `tools.py` (tool schemas), `memory.py` (JSON persistence)
- `main.py` — FastAPI app (original endpoints + `/api/os/*`)
- `static/os.html` — Mission Control UI
- `nextjs/` — standalone Next.js dashboard (separate app, unchanged)
- `gas/` — Google Apps Script version (unchanged)
