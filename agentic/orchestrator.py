"""The kernel of the agentic OS: runs agents in a tool-use loop.

run_agent() drives one specialist through Claude's tool-use loop against the
shared memory tools. run_mission_control() does the same for the orchestrator,
which additionally holds a delegate_to_agent tool that spawns specialist runs
as sub-calls — that is what turns a set of prompts into a coordinated system.
"""

import json
import os

import anthropic

from . import memory, tools
from .registry import AGENTS, ORCHESTRATOR_SYSTEM, agent_card

MODEL = os.environ.get("AGENTIC_MODEL", "claude-sonnet-4-6")
MAX_LOOPS = 12          # hard stop so a confused agent can't spin forever
MAX_DELEGATIONS = 6     # per Mission Control run

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()  # uses ANTHROPIC_API_KEY from the environment
    return _client


def _state_block() -> str:
    return "CURRENT OS STATE SNAPSHOT:\n" + json.dumps(memory.snapshot(), indent=2)


def _tool_loop(system: str, messages: list, tool_schemas: list, agent_name: str) -> dict:
    """Run one agent until it stops calling tools. Returns final text + trace."""
    client = _get_client()
    trace = []
    for _ in range(MAX_LOOPS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=4000,
            system=system + "\n\n" + _state_block(),
            messages=messages,
            tools=tool_schemas,
        )
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if not tool_uses:
            text = "".join(b.text for b in response.content if b.type == "text")
            return {"text": text, "trace": trace}

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for tu in tool_uses:
            result = tools.execute(tu.name, tu.input)
            trace.append({"agent": agent_name, "tool": tu.name, "input": tu.input})
            results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
        messages.append({"role": "user", "content": results})

    return {"text": "(stopped: agent exceeded its tool-call budget)", "trace": trace}


def run_agent(agent_name: str, message: str, history: list | None = None) -> dict:
    """Run a single specialist agent on a message."""
    if agent_name not in AGENTS:
        raise ValueError(f"unknown agent '{agent_name}'")
    spec = AGENTS[agent_name]
    messages = list(history or []) + [{"role": "user", "content": message}]
    result = _tool_loop(spec["system"], messages, tools.schemas_for(spec["tools"]), agent_name)
    memory.log_activity(agent_name, message[:140])
    return {"agent": agent_card(agent_name), "reply": result["text"], "trace": result["trace"]}


def run_mission_control(message: str, history: list | None = None) -> dict:
    """Run the orchestrator, which can delegate to any specialist."""
    delegate_schema = {
        "name": "delegate_to_agent",
        "description": (
            "Hand a task to a specialist agent and get its result back. Available agents: "
            + "; ".join(f"{n} ({AGENTS[n]['title']}): {AGENTS[n]['description']}" for n in AGENTS)
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "agent": {"type": "string", "enum": list(AGENTS.keys())},
                "brief": {
                    "type": "string",
                    "description": "Complete, self-contained instructions — the specialist cannot see this conversation.",
                },
            },
            "required": ["agent", "brief"],
        },
    }

    client = _get_client()
    tool_schemas = tools.schemas_for(tools.ALL_TOOL_NAMES) + [delegate_schema]
    messages = list(history or []) + [{"role": "user", "content": message}]
    trace = []
    delegations = 0

    for _ in range(MAX_LOOPS):
        response = client.messages.create(
            model=MODEL,
            max_tokens=4000,
            system=ORCHESTRATOR_SYSTEM + "\n\n" + _state_block(),
            messages=messages,
            tools=tool_schemas,
        )
        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if not tool_uses:
            text = "".join(b.text for b in response.content if b.type == "text")
            memory.log_activity("mission_control", message[:140])
            return {"agent": {"name": "mission_control", "emoji": "🛰️", "title": "Mission Control"},
                    "reply": text, "trace": trace}

        messages.append({"role": "assistant", "content": response.content})
        results = []
        for tu in tool_uses:
            if tu.name == "delegate_to_agent":
                delegations += 1
                if delegations > MAX_DELEGATIONS:
                    result = {"error": "delegation budget exceeded — synthesize what you have"}
                else:
                    sub = run_agent(tu.input["agent"], tu.input["brief"])
                    trace.append({"agent": "mission_control", "tool": "delegate_to_agent",
                                  "input": {"agent": tu.input["agent"], "brief": tu.input["brief"][:200]}})
                    trace.extend(sub["trace"])
                    result = {"agent": tu.input["agent"], "result": sub["reply"]}
            else:
                result = tools.execute(tu.name, tu.input)
                trace.append({"agent": "mission_control", "tool": tu.name, "input": tu.input})
            results.append({
                "type": "tool_result",
                "tool_use_id": tu.id,
                "content": json.dumps(result, ensure_ascii=False),
            })
        messages.append({"role": "user", "content": results})

    memory.log_activity("mission_control", message[:140])
    return {"agent": {"name": "mission_control", "emoji": "🛰️", "title": "Mission Control"},
            "reply": "(stopped: orchestrator exceeded its tool-call budget)", "trace": trace}
