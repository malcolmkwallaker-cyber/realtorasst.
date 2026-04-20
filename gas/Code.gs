// ── Setup ─────────────────────────────────────────────────────────────────
//
// 1. npm install -g @google/clasp && clasp login
// 2. cd gas && clasp create --type webapp --title "Realtor Daily Assistant"
//    (this writes the real scriptId into clasp.json)
// 3. clasp push
// 4. GAS editor → Project Settings → Script Properties → add:
//      ANTHROPIC_API_KEY = sk-ant-...
// 5. Deploy → New deployment → Web app → Anyone → copy the /exec URL
//
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are a highly experienced real estate coach and operations expert.\n" +
  "You help realtors run their business efficiently. Your tone is professional, practical,\n" +
  "and action-oriented. You know real estate workflows, lead generation, client management,\n" +
  "transaction coordination, and agent training inside and out.";

// ── Web app entry point ───────────────────────────────────────────────────

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("Realtor Daily Assistant")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Called by <?!= include('Style'); ?> and <?!= include('JavaScript'); ?> in Index.html
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── Anthropic API wrapper ─────────────────────────────────────────────────

function callClaude(prompt, maxTokens) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set in Script Properties.");

  const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    payload: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens || 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }]
    }),
    muteHttpExceptions: true
  });

  const data = JSON.parse(response.getContentText());
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

// ── Module 1: Daily Planner ───────────────────────────────────────────────

function generateDailyPlan(params) {
  const prompt =
    "Create a structured daily action plan for a real estate agent. Format it clearly with time blocks, priorities, and specific action items.\n\n" +
    "TODAY'S APPOINTMENTS:\n" + (params.appointments || "None scheduled") + "\n\n" +
    "ACTIVE LEADS TO FOLLOW UP:\n" + (params.leads || "None listed") + "\n\n" +
    "PENDING DEALS / TRANSACTIONS:\n" + (params.pending_deals || "None") + "\n\n" +
    "ADDITIONAL NOTES:\n" + (params.personal_notes || "None") + "\n\n" +
    "Generate:\n" +
    "1. A prioritized morning routine checklist (first 90 minutes)\n" +
    "2. Time-blocked schedule for the day\n" +
    "3. Top 3 highest-impact actions for today\n" +
    "4. End-of-day wrap-up tasks\n" +
    "5. A motivational focus statement for the day\n\n" +
    "Be specific, practical, and action-oriented. Use real estate best practices.";

  return callClaude(prompt, 2048);
}

// ── Module 2: VA Handoff ──────────────────────────────────────────────────

function generateVAHandoff(params) {
  const prompt =
    "Create a clear, detailed VA task handoff document for Dan (the virtual assistant).\n" +
    "Dan handles administrative tasks, follow-ups, scheduling, and CRM updates for a real estate agent.\n\n" +
    "TASKS TO DELEGATE:\n" + params.tasks + "\n\n" +
    "PRIORITY LEVEL: " + params.priority + "\n" +
    "DEADLINE: " + (params.deadline || "End of business day") + "\n" +
    "ADDITIONAL CONTEXT: " + (params.context || "None") + "\n\n" +
    "Write the handoff as if you're speaking directly to Dan. Include:\n" +
    "1. A clear task summary (what needs to be done and why)\n" +
    "2. Step-by-step instructions for each task — assume Dan is detail-oriented but needs explicit steps\n" +
    "3. Any scripts or email templates needed (with [BRACKETS] for fill-in fields)\n" +
    "4. What \"done\" looks like for each task (definition of completion)\n" +
    "5. Where to log or report results\n" +
    "6. Any red flags or escalation triggers to bring back to the agent\n\n" +
    "Make it copy-paste ready so Dan can work from it immediately.";

  return callClaude(prompt, 3000);
}

// ── Module 3: Agent How-To ────────────────────────────────────────────────

function generateAgentHowTo(params) {
  const experienceMap = {
    "new": "brand new to real estate, just got their license",
    "junior": "has been in real estate 1-2 years with some experience",
    "experienced": "has 3+ years experience but wants to level up a specific skill"
  };
  const experienceContext = experienceMap[params.agent_experience] || "new to real estate";

  const prompt =
    "Write a comprehensive, practical how-to guide for a real estate agent who is " + experienceContext + ".\n\n" +
    "TOPIC: " + params.topic + "\n\n" +
    "SPECIFIC QUESTIONS TO ADDRESS: " + (params.specific_questions || "Cover all the essentials") + "\n\n" +
    "Write the guide with:\n" +
    "1. Overview — why this matters and what outcome they'll achieve\n" +
    "2. What you need before you start (tools, accounts, info)\n" +
    "3. Step-by-step instructions — numbered, clear, actionable\n" +
    "4. Pro tips from experienced agents\n" +
    "5. Common mistakes to avoid\n" +
    "6. Scripts or templates they can use immediately\n" +
    "7. How to know if they're doing it right (success metrics)\n\n" +
    "Write in plain, conversational language. Avoid jargon unless you define it.\n" +
    "This should read like advice from a top-producing mentor, not a textbook.";

  return callClaude(prompt, 3500);
}
