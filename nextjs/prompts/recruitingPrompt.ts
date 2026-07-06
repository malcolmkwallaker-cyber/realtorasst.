import type { UserSettings } from '@/types'
import { identity, text, type Inputs, type PromptSpec } from './common'

export function buildRecruitingPrompt(inputs: Inputs, settings: Partial<UserSettings>): PromptSpec[] {
  const { agent, brokerage, markets } = identity(settings)
  const valueProp = text(settings.recruiting_value_prop, 'systems, support, lead generation, social media tools, training, and collaborative culture')
  const firstName = text(inputs.first_name, '[Agent Name]')
  const market = text(inputs.market_area, markets)

  const ctx = `Recruit: ${firstName} ${text(inputs.last_name, '')}
Current Brokerage: ${text(inputs.current_brokerage, 'unknown')}
Experience: ${text(inputs.years_experience, 'unknown')} years
Market: ${market}
Agent Type: ${text(inputs.agent_type, 'experienced agent')}
Notes: ${text(inputs.notes, 'none')}
Recruiting Agent: ${agent}, ${brokerage}
Value Proposition: ${valueProp}
Markets: ${markets}`

  return [
    { id: 'cold_dm', label: 'Cold DM', prompt: `Write a short, genuine cold DM from ${agent} to ${firstName}, an agent at another brokerage. Under 5 sentences. Compliment something specific (use a placeholder), mention ${brokerage} briefly, and ask if they would be open to a conversation. No hard sell.\n\n${ctx}` },
    { id: 'cold_email', label: 'Cold Email', prompt: `Write a cold recruiting email from ${agent} to ${firstName}. Include a subject line and body under 200 words. Lead with their success, bridge to what ${brokerage} offers, and make a soft ask for a coffee or call. No pressure.\n\n${ctx}` },
    { id: 'followup', label: 'Follow-Up Message', prompt: `Write a follow-up message from ${agent} to ${firstName} who has not responded to the initial outreach. Reference the first message, offer something of value such as a market insight or specific resource, and make it easy to say yes to a quick call.\n\n${ctx}` },
    { id: 'coffee_invite', label: 'Coffee Invite', prompt: `Write a casual text from ${agent} inviting ${firstName} for coffee or a 20-minute call. No agenda pressure. Just a conversation between colleagues about what is working in ${market}. Friendly and low-key.\n\n${ctx}` },
    { id: 'call_script', label: 'Call Script', prompt: `Write a phone call script for ${agent} to use when calling ${firstName} for the first recruiting conversation. Include an opener that disarms, a discovery question about what they love and would change about their current situation, a bridge to ${brokerage}'s offer, and how to handle the objection that they are happy where they are.\n\n${ctx}` },
    { id: 'post_meeting', label: 'Post-Meeting Follow-Up', prompt: `Write a follow-up email from ${agent} to ${firstName} after a recruiting coffee meeting. Reference one or two things from the conversation (use placeholders), reiterate the key value points of ${brokerage}, and outline a clear next step without pressure.\n\n${ctx}` },
    { id: 'partnership_email', label: 'Partnership Email', prompt: `Write a formal partnership proposal email from ${agent} at ${brokerage} to ${firstName}. This is for a broker-owner or team leader who might be open to a merger or affiliation. Professional, respectful, and specific about what the partnership would look like.\n\n${ctx}` },
    { id: 'value_prop', label: 'Value Proposition', prompt: `Write a concise value proposition document from ${agent} at ${brokerage} for ${firstName}. Cover what makes ${brokerage} different, specific tools and support provided, the culture, and why ${markets} is a strong market to build in. One page, punchy, no fluff.\n\n${ctx}` },
  ]
}
