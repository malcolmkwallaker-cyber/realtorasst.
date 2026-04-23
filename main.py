import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv
import activity_monitor

load_dotenv()

app = FastAPI(title="Realtor Daily Assistant")
activity_monitor.init_db()

_api_key = os.environ.get("ANTHROPIC_API_KEY")
if not _api_key:
    raise RuntimeError("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.")

client = anthropic.Anthropic(api_key=_api_key)

SYSTEM_PROMPT = """You are a highly experienced real estate coach and operations expert.
You help realtors run their business efficiently. Your tone is professional, practical,
and action-oriented. You know real estate workflows, lead generation, client management,
transaction coordination, and agent training inside and out."""


class DailyPlanRequest(BaseModel):
    appointments: str
    leads: str
    pending_deals: str
    personal_notes: str = ""


class VAHandoffRequest(BaseModel):
    tasks: str
    priority: str = "normal"
    deadline: str = ""
    context: str = ""


class AgentHowToRequest(BaseModel):
    topic: str
    agent_experience: str = "new"
    specific_questions: str = ""


class SessionIdRequest(BaseModel):
    session_id: int


class PhoneActivityRequest(BaseModel):
    app_name: str
    window_title: str
    duration_sec: int = 0
    source: str = "phone"


def call_claude(prompt: str, max_tokens: int = 2048) -> str:
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return FileResponse("static/index.html")


@app.post("/api/daily-plan")
async def generate_daily_plan(req: DailyPlanRequest):
    prompt = f"""Create a structured daily action plan for a real estate agent. Format it clearly with time blocks, priorities, and specific action items.

TODAY'S APPOINTMENTS:
{req.appointments or "None scheduled"}

ACTIVE LEADS TO FOLLOW UP:
{req.leads or "None listed"}

PENDING DEALS / TRANSACTIONS:
{req.pending_deals or "None"}

ADDITIONAL NOTES:
{req.personal_notes or "None"}

Generate:
1. A prioritized morning routine checklist (first 90 minutes)
2. Time-blocked schedule for the day
3. Top 3 highest-impact actions for today
4. End-of-day wrap-up tasks
5. A motivational focus statement for the day

Be specific, practical, and action-oriented. Use real estate best practices."""

    try:
        result = call_claude(prompt)
        return {"plan": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/va-handoff")
async def generate_va_handoff(req: VAHandoffRequest):
    prompt = f"""Create a clear, detailed VA task handoff document for Dan (the virtual assistant).
Dan handles administrative tasks, follow-ups, scheduling, and CRM updates for a real estate agent.

TASKS TO DELEGATE:
{req.tasks}

PRIORITY LEVEL: {req.priority}
DEADLINE: {req.deadline or "End of business day"}
ADDITIONAL CONTEXT: {req.context or "None"}

Write the handoff as if you're speaking directly to Dan. Include:
1. A clear task summary (what needs to be done and why)
2. Step-by-step instructions for each task — assume Dan is detail-oriented but needs explicit steps
3. Any scripts or email templates needed (with [BRACKETS] for fill-in fields)
4. What "done" looks like for each task (definition of completion)
5. Where to log or report results
6. Any red flags or escalation triggers to bring back to the agent

Make it copy-paste ready so Dan can work from it immediately."""

    try:
        result = call_claude(prompt, max_tokens=3000)
        return {"handoff": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agent-howto")
async def generate_agent_howto(req: AgentHowToRequest):
    experience_context = {
        "new": "brand new to real estate, just got their license",
        "junior": "has been in real estate 1-2 years with some experience",
        "experienced": "has 3+ years experience but wants to level up a specific skill",
    }.get(req.agent_experience, "new to real estate")

    prompt = f"""Write a comprehensive, practical how-to guide for a real estate agent who is {experience_context}.

TOPIC: {req.topic}

SPECIFIC QUESTIONS TO ADDRESS: {req.specific_questions or "Cover all the essentials"}

Write the guide with:
1. Overview — why this matters and what outcome they'll achieve
2. What you need before you start (tools, accounts, info)
3. Step-by-step instructions — numbered, clear, actionable
4. Pro tips from experienced agents
5. Common mistakes to avoid
6. Scripts or templates they can use immediately
7. How to know if they're doing it right (success metrics)

Write in plain, conversational language. Avoid jargon unless you define it.
This should read like advice from a top-producing mentor, not a textbook."""

    try:
        result = call_claude(prompt, max_tokens=3500)
        return {"guide": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/monitor/start")
async def monitor_start():
    result = activity_monitor.start_monitor()
    if result["status"] == "not_running_xdotool":
        raise HTTPException(
            status_code=503,
            detail="xdotool is not installed. Install it with: sudo apt install xdotool"
        )
    return result


@app.post("/api/monitor/stop")
async def monitor_stop():
    return activity_monitor.stop_monitor()


@app.get("/api/monitor/status")
async def monitor_status():
    return activity_monitor.get_monitor_status()


@app.get("/api/sessions")
async def get_sessions():
    activity_monitor.finalize_sessions()
    return {"sessions": activity_monitor.list_sessions()}


@app.get("/api/sessions/{session_id}/activities")
async def get_session_activities(session_id: int):
    acts = activity_monitor.get_session_activities(session_id)
    if not acts:
        raise HTTPException(status_code=404, detail="Session not found or has no activities")
    return {"activities": acts}


@app.post("/api/sessions/generate-sop")
async def generate_sop(req: SessionIdRequest):
    existing = activity_monitor.get_sop(req.session_id)
    if existing:
        return {"sop": existing}

    activities = activity_monitor.get_session_activities(req.session_id)
    if not activities:
        raise HTTPException(status_code=404, detail="Session not found or has no activities")

    lines = []
    for a in activities:
        mins = a["duration_sec"] // 60
        secs = a["duration_sec"] % 60
        dur = f"{mins}m {secs}s" if mins else f"{secs}s"
        ts = a["timestamp"][11:16] if len(a["timestamp"]) >= 16 else a["timestamp"]
        src = f"[{a['source']}]" if a["source"] != "desktop" else ""
        lines.append(f"- [{ts}]{src} {a['app_name']} | {a['window_title']} | {dur}")
    activity_log = "\n".join(lines)

    prompt = f"""You are analyzing a computer and phone activity log captured from a real estate agent's devices.
Your task is to reverse-engineer what the agent was doing and write a clear, reusable Standard Operating Procedure (SOP) that a virtual assistant could follow to replicate the same workflow.

ACTIVITY LOG (chronological — format: [HH:MM][source?] App | Window Title | Duration):
{activity_log}

Based on this log, write a professional SOP document with these sections:

1. TASK NAME — A short, descriptive title for what this workflow accomplishes

2. PURPOSE — 1-2 sentences on why this task is done and what outcome it achieves

3. TOOLS REQUIRED — List every app, website, or platform used (desktop and phone)

4. STEP-BY-STEP INSTRUCTIONS — Numbered steps that replicate exactly what the agent did, inferred from the app and window title sequence. Be specific. Where a window title reveals a web page or document name, reference it explicitly.

5. ESTIMATED TIME — Based on the actual durations in the log

6. NOTES & TIPS — Any patterns you notice and advice for the VA doing this task

Write in plain, direct language suitable for a real estate virtual assistant. Do not speculate beyond what the activity log shows."""

    try:
        sop_text = call_claude(prompt, max_tokens=3000)
        activity_monitor.save_sop(req.session_id, sop_text)
        return {"sop": sop_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/phone/activity")
async def phone_activity(req: PhoneActivityRequest):
    activity_monitor.log_phone_activity(
        req.app_name, req.window_title, req.duration_sec, req.source
    )
    return {"status": "logged"}


app.mount("/static", StaticFiles(directory="static"), name="static")
