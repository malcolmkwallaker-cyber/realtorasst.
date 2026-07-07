"""Tool definitions the agents can call, backed by the shared memory store.

Each tool is defined once here as (schema, implementation). The orchestrator
filters this registry per agent, so specialists only see the tools they are
allowed to use.
"""

from . import memory

TOOL_SCHEMAS = [
    {
        "name": "remember",
        "description": "Save a fact to long-term shared memory so any agent can recall it later. Use descriptive keys like 'client_smith_preferences' or 'my_farm_area'.",
        "input_schema": {
            "type": "object",
            "properties": {
                "key": {"type": "string", "description": "Short descriptive key for the fact"},
                "value": {"type": "string", "description": "The fact to remember"},
            },
            "required": ["key", "value"],
        },
    },
    {
        "name": "recall",
        "description": "Search long-term shared memory for saved facts. Pass an empty query to list everything.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Substring to search keys and values for"},
            },
        },
    },
    {
        "name": "add_lead",
        "description": "Add a new lead to the shared pipeline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "source": {"type": "string", "description": "Where the lead came from (referral, Zillow, open house...)"},
                "stage": {"type": "string", "enum": memory.LEAD_STAGES},
                "notes": {"type": "string"},
                "next_action": {"type": "string", "description": "The very next concrete step for this lead"},
            },
            "required": ["name"],
        },
    },
    {
        "name": "update_lead",
        "description": "Update a lead's stage, append notes, or set its next action. Look up the lead id with list_leads first if you don't have it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lead_id": {"type": "string"},
                "stage": {"type": "string", "enum": memory.LEAD_STAGES},
                "notes": {"type": "string", "description": "Notes to append to the lead's history"},
                "next_action": {"type": "string"},
            },
            "required": ["lead_id"],
        },
    },
    {
        "name": "list_leads",
        "description": "List leads in the pipeline, optionally filtered by stage.",
        "input_schema": {
            "type": "object",
            "properties": {
                "stage": {"type": "string", "enum": memory.LEAD_STAGES},
            },
        },
    },
    {
        "name": "add_task",
        "description": "Add a task to the shared task queue. Owner can be 'me' (the realtor), 'va' (the virtual assistant), or an agent name.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "owner": {"type": "string", "description": "'me', 'va', or an agent name"},
                "due": {"type": "string", "description": "Due date/time in plain words or ISO format"},
                "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
                "details": {"type": "string"},
            },
            "required": ["title"],
        },
    },
    {
        "name": "update_task",
        "description": "Update a task's status or append details. Statuses: open, in_progress, done, cancelled.",
        "input_schema": {
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "status": {"type": "string", "enum": memory.TASK_STATUSES},
                "details": {"type": "string"},
            },
            "required": ["task_id"],
        },
    },
    {
        "name": "list_tasks",
        "description": "List tasks in the shared queue, optionally filtered by status and/or owner.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "enum": memory.TASK_STATUSES},
                "owner": {"type": "string"},
            },
        },
    },
    {
        "name": "recent_activity",
        "description": "See what the other agents have done recently (the OS activity log).",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer", "description": "Max entries to return (default 20)"},
            },
        },
    },
]

TOOL_IMPLS = {
    "remember": lambda args: memory.remember(args["key"], args["value"]),
    "recall": lambda args: memory.recall(args.get("query", "")),
    "add_lead": lambda args: memory.add_lead(
        args["name"], args.get("source", ""), args.get("stage", "new"),
        args.get("notes", ""), args.get("next_action", ""),
    ),
    "update_lead": lambda args: memory.update_lead(
        args["lead_id"], args.get("stage", ""), args.get("notes", ""), args.get("next_action", ""),
    ),
    "list_leads": lambda args: memory.list_leads(args.get("stage", "")),
    "add_task": lambda args: memory.add_task(
        args["title"], args.get("owner", "me"), args.get("due", ""),
        args.get("priority", "normal"), args.get("details", ""),
    ),
    "update_task": lambda args: memory.update_task(
        args["task_id"], args.get("status", ""), args.get("details", ""),
    ),
    "list_tasks": lambda args: memory.list_tasks(args.get("status", ""), args.get("owner", "")),
    "recent_activity": lambda args: memory.recent_activity(int(args.get("limit", 20))),
}

ALL_TOOL_NAMES = [t["name"] for t in TOOL_SCHEMAS]


def schemas_for(names):
    return [t for t in TOOL_SCHEMAS if t["name"] in names]


def execute(name: str, args: dict) -> dict:
    impl = TOOL_IMPLS.get(name)
    if impl is None:
        return {"error": f"unknown tool '{name}'"}
    try:
        return impl(args or {})
    except Exception as e:  # surface tool failures to the model instead of crashing the loop
        return {"error": str(e)}
