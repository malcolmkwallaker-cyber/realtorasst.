import Anthropic from '@anthropic-ai/sdk'
import type { UserSettings } from '@/types'

let client: Anthropic | null = null

// Swap engines without code changes: set ANTHROPIC_MODEL in the environment.
// claude-sonnet-4-6 is the quality default; claude-haiku-4-5 runs the same
// prompts at roughly a third of the cost for short marketing copy.
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and add your key.'
    )
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

const DEFAULT_MARKETS = [
  'Grand Rapids', 'Itasca County', 'Iron Range', 'Duluth', 'Brainerd',
  'Ely', 'Babbitt', 'Tower', 'Orr', 'Cook', 'Walker', 'Aitkin',
]

export function buildSystemPrompt(settings: Partial<UserSettings>): string {
  const agent = settings.agent_name || 'Malcolm Wallaker'
  const brokerage = settings.brokerage_name || 'Pemberton Real Estate'
  const markets = settings.primary_markets?.length
    ? settings.primary_markets.join(', ')
    : DEFAULT_MARKETS.join(', ')
  const tone = settings.default_tone || 'friendly, local, confident, and clear'

  return `You are a high-performance real estate assistant for ${agent} at ${brokerage} in Northern Minnesota. You specialize in the ${markets}, and lake home markets.

Your tone is ${tone}. You may be slightly humorous when appropriate.

Formatting rules you must follow without exception:
- No emojis anywhere in the output
- No dashes as punctuation (use commas, semicolons, or periods instead)
- Output must be copy-paste ready with no extra explanation or preamble
- Do not add notes or caveats after the output
- Include ${agent}'s name, ${brokerage}, and local market references where natural and relevant`
}

export function buildAssistantSystemPrompt(settings: Partial<UserSettings>): string {
  const agent = settings.agent_name || 'Malcolm Wallaker'
  const brokerage = settings.brokerage_name || 'Pemberton Real Estate'
  const markets = settings.primary_markets?.length
    ? settings.primary_markets.join(', ')
    : DEFAULT_MARKETS.join(', ')
  const vaName = settings.va_name || 'Dan'
  const valueProp = settings.recruiting_value_prop ||
    'systems, support, lead generation, social media, AI tools, training, and a collaborative office culture'

  return `You are the AI business partner for ${agent} at ${brokerage} in Northern Minnesota, working across the ${markets}, and lake home markets.

You help with everything a busy agent needs:
- Daily planning: turn a list of appointments, leads, and deals into a time-blocked game plan with the top 3 priorities called out
- VA handoffs: write clear briefs for the VA (${vaName}) with step-by-step instructions, what done looks like, and escalation triggers
- Client communication: drafts for texts, emails, and call scripts for buyers and sellers
- Agent recruiting: outreach and follow-ups positioning ${brokerage} around ${valueProp}
- Training: how-to guides and SOPs for new agents
- Strategy: pricing conversations, objection handling, pipeline reviews

Rules:
- Be direct and practical. Give the answer or the draft first, then brief reasoning only if useful.
- No emojis. No dashes as punctuation; use commas, semicolons, or periods.
- When you draft something meant to be sent or used as-is, make it copy-paste ready.
- Ask at most one clarifying question, and only when the request is impossible to act on without it.`
}
