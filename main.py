import os
import json as json_lib
import datetime
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Realtor Daily Assistant")

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


class LeadAnalysisRequest(BaseModel):
    lead: dict


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


# ─────────────────────────────────────────────────────────────
# FUB LEAD SYSTEM ENDPOINTS
# ─────────────────────────────────────────────────────────────
# FUTURE INTEGRATION: Replace local storage with Follow Up Boss API
#   POST https://api.followupboss.com/v1/people  (create/update leads)
#   GET  https://api.followupboss.com/v1/people  (fetch leads)
#   Auth: Basic auth with FUB API key
# ─────────────────────────────────────────────────────────────

@app.post("/api/fub/analyze-lead")
async def analyze_lead(req: LeadAnalysisRequest):
    lead = req.lead
    agent_name = lead.get("buyerAgentName") or "your buyer agent"

    prompt = f"""You are Malcolm's real estate business assistant. Analyze this lead and return a JSON object.

LEAD:
Name: {lead.get("name", "Unknown")}
Source: {lead.get("source", "Unknown")}
Lead Type: {lead.get("leadType", "unknown")}
Price Range: {lead.get("priceRange", "Unknown")}
Desired Area: {lead.get("desiredArea", "Unknown")}
Timeline: {lead.get("timeline", "Unknown")}
Motivation: {lead.get("motivationLevel", "unknown")}
Preapproval: {lead.get("preapprovalStatus", "unknown")}
Last Contacted: {lead.get("lastContacted") or "Never"}
Current Status: {lead.get("leadStatus", "New")}
Assigned Agent: {lead.get("assignedAgent") or "Unassigned"}
Notes: {lead.get("notes") or "None"}

ASSIGNMENT RULES:
- Buyer leads, first time buyers, showing requests, lower price point, fast response needed → ownership: buyer_agent
- Listing leads, high-end lake buyers ($500k+), referral partners, high-value relationships → ownership: malcolm
- Investors → ownership: malcolm

Return ONLY this JSON (no markdown, no extra text):
{{
  "summary": "2-3 sentence lead summary",
  "bestNextStep": "specific action to take right now",
  "ownership": "malcolm",
  "ownershipReason": "one sentence reason",
  "suggestedClientMessage": "warm casual short text to {lead.get("name", "the client")}",
  "suggestedAgentMessage": "internal handoff message to {agent_name} (empty string if malcolm owns this lead)",
  "followUpDaysOut": 1,
  "riskLevel": "low",
  "riskReason": "brief reason",
  "fubNotes": "notes to add to Follow Up Boss"
}}"""

    try:
        raw = call_claude(prompt, max_tokens=1200)
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = json_lib.loads(clean)
        return data
    except json_lib.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned an unparseable response — try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/static", StaticFiles(directory="static"), name="static")
