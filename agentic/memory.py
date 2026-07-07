"""Persistent shared memory for the agentic OS.

Everything is stored as JSON files under DATA_DIR so the system works with
zero external dependencies (no database required). All agents read and write
the same store, which is what makes them feel like one coordinated system
instead of isolated chatbots.

Collections:
  - notes:  free-form remembered facts (key -> value), e.g. client preferences
  - leads:  the lead pipeline (id, name, stage, notes, next_action, ...)
  - tasks:  the shared task queue (id, title, owner, status, due, ...)
  - log:    append-only activity log of what each agent did and when
"""

import json
import os
import threading
import uuid
from datetime import datetime, timezone

DATA_DIR = os.environ.get(
    "AGENTIC_DATA_DIR",
    os.path.join(os.path.dirname(__file__), "..", "data"),
)

_lock = threading.Lock()

LEAD_STAGES = ["new", "contacted", "nurturing", "appointment_set", "under_contract", "closed", "lost"]
TASK_STATUSES = ["open", "in_progress", "done", "cancelled"]


def _path(collection: str) -> str:
    return os.path.join(DATA_DIR, f"{collection}.json")


def _load(collection: str, default):
    try:
        with open(_path(collection), "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _save(collection: str, data) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = _path(collection) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, _path(collection))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# ---------------------------------------------------------------- notes

def remember(key: str, value: str) -> dict:
    with _lock:
        notes = _load("notes", {})
        notes[key] = {"value": value, "updated_at": _now()}
        _save("notes", notes)
    return {"ok": True, "key": key}


def recall(query: str = "") -> dict:
    notes = _load("notes", {})
    if query:
        q = query.lower()
        notes = {
            k: v for k, v in notes.items()
            if q in k.lower() or q in str(v.get("value", "")).lower()
        }
    return {"notes": notes}


def forget(key: str) -> dict:
    with _lock:
        notes = _load("notes", {})
        existed = notes.pop(key, None) is not None
        _save("notes", notes)
    return {"ok": existed, "key": key}


# ---------------------------------------------------------------- leads

def add_lead(name: str, source: str = "", stage: str = "new", notes: str = "", next_action: str = "") -> dict:
    if stage not in LEAD_STAGES:
        stage = "new"
    lead = {
        "id": _new_id("lead"),
        "name": name,
        "source": source,
        "stage": stage,
        "notes": notes,
        "next_action": next_action,
        "created_at": _now(),
        "updated_at": _now(),
    }
    with _lock:
        leads = _load("leads", [])
        leads.append(lead)
        _save("leads", leads)
    return lead


def update_lead(lead_id: str, stage: str = "", notes: str = "", next_action: str = "") -> dict:
    with _lock:
        leads = _load("leads", [])
        for lead in leads:
            if lead["id"] == lead_id:
                if stage:
                    if stage not in LEAD_STAGES:
                        return {"error": f"invalid stage '{stage}', must be one of {LEAD_STAGES}"}
                    lead["stage"] = stage
                if notes:
                    lead["notes"] = (lead.get("notes", "") + "\n" + notes).strip()
                if next_action:
                    lead["next_action"] = next_action
                lead["updated_at"] = _now()
                _save("leads", leads)
                return lead
    return {"error": f"lead '{lead_id}' not found"}


def list_leads(stage: str = "") -> dict:
    leads = _load("leads", [])
    if stage:
        leads = [l for l in leads if l.get("stage") == stage]
    return {"count": len(leads), "leads": leads}


# ---------------------------------------------------------------- tasks

def add_task(title: str, owner: str = "agent", due: str = "", priority: str = "normal", details: str = "") -> dict:
    task = {
        "id": _new_id("task"),
        "title": title,
        "owner": owner,
        "due": due,
        "priority": priority,
        "details": details,
        "status": "open",
        "created_at": _now(),
        "updated_at": _now(),
    }
    with _lock:
        tasks = _load("tasks", [])
        tasks.append(task)
        _save("tasks", tasks)
    return task


def update_task(task_id: str, status: str = "", details: str = "") -> dict:
    with _lock:
        tasks = _load("tasks", [])
        for task in tasks:
            if task["id"] == task_id:
                if status:
                    if status not in TASK_STATUSES:
                        return {"error": f"invalid status '{status}', must be one of {TASK_STATUSES}"}
                    task["status"] = status
                if details:
                    task["details"] = (task.get("details", "") + "\n" + details).strip()
                task["updated_at"] = _now()
                _save("tasks", tasks)
                return task
    return {"error": f"task '{task_id}' not found"}


def list_tasks(status: str = "", owner: str = "") -> dict:
    tasks = _load("tasks", [])
    if status:
        tasks = [t for t in tasks if t.get("status") == status]
    if owner:
        tasks = [t for t in tasks if t.get("owner") == owner]
    return {"count": len(tasks), "tasks": tasks}


# ---------------------------------------------------------------- log

def log_activity(agent: str, summary: str) -> dict:
    entry = {"at": _now(), "agent": agent, "summary": summary}
    with _lock:
        log = _load("log", [])
        log.append(entry)
        _save("log", log[-500:])  # keep the log bounded
    return {"ok": True}


def recent_activity(limit: int = 20) -> dict:
    log = _load("log", [])
    return {"entries": log[-limit:]}


def snapshot() -> dict:
    """Compact state summary injected into every agent's context."""
    leads = _load("leads", [])
    tasks = _load("tasks", [])
    open_tasks = [t for t in tasks if t.get("status") in ("open", "in_progress")]
    active_leads = [l for l in leads if l.get("stage") not in ("closed", "lost")]
    return {
        "date": _now(),
        "active_leads": len(active_leads),
        "open_tasks": len(open_tasks),
        "leads_by_stage": {s: sum(1 for l in leads if l.get("stage") == s) for s in LEAD_STAGES},
        "next_tasks": [
            {"id": t["id"], "title": t["title"], "owner": t.get("owner"), "due": t.get("due"), "priority": t.get("priority")}
            for t in open_tasks[:10]
        ],
        "hot_leads": [
            {"id": l["id"], "name": l["name"], "stage": l["stage"], "next_action": l.get("next_action")}
            for l in active_leads[:10]
        ],
    }
