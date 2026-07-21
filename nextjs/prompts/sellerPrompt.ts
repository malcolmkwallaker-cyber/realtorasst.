import type { UserSettings } from '@/types'
import { identity, text, type Inputs, type PromptSpec } from './common'

export function buildSellerPrompt(inputs: Inputs, settings: Partial<UserSettings>): PromptSpec[] {
  const { agent, brokerage } = identity(settings)
  const firstName = text(inputs.first_name, '[First Name]')
  const address = text(inputs.address, 'their property')

  const ctx = `Seller: ${firstName} ${text(inputs.last_name, '')}
Property: ${address}, ${text(inputs.city, 'Northern MN')}
Situation: ${text(inputs.situation, 'general')}
Timeline: ${text(inputs.timeline, 'unknown')}
Notes: ${text(inputs.notes, 'none')}
Agent: ${agent}, ${brokerage}`

  return [
    { id: 'cma_followup', label: 'CMA Follow-Up', prompt: `Write a follow-up email to ${firstName} after delivering a CMA. Thank them for their time, summarize the key takeaway in one sentence, and invite them to a 15-minute call to answer questions. Professional but warm. From ${agent}.\n\n${ctx}` },
    { id: 'listing_confirm', label: 'Listing Appt Confirmation', prompt: `Write a listing appointment confirmation text to ${firstName}. Include date and time placeholder, address, what to expect during the appointment, and that ${agent} is looking forward to it.\n\n${ctx}` },
    { id: 'prelisting_checklist', label: 'Pre-Listing Checklist', prompt: `Write a pre-listing preparation checklist to send to ${firstName} as they prepare their home for sale. Include tasks for decluttering, repairs, curb appeal, and what to expect. Make it encouraging, not overwhelming. From ${agent} at ${brokerage}.\n\n${ctx}` },
    { id: 'price_reduction', label: 'Price Reduction Script', prompt: `Write a phone call script ${agent} can use to have the price reduction conversation with ${firstName}. Acknowledge the situation, reference market data (use placeholder for actual stats), present it as a strategic move, handle the likely objection that they need a specific amount, and guide toward a decision. Natural dialogue, not robotic.\n\n${ctx}` },
    { id: 'expired_outreach', label: 'Expired Listing Outreach', prompt: `Write an outreach letter or email to ${firstName}, whose listing just expired with another agent. Sympathetic, not predatory. Position ${agent} and ${brokerage} as the fresh start they need. Focus on what will be done differently. No negative remarks about the previous agent.\n\n${ctx}` },
    { id: 'fsbo_outreach', label: 'FSBO Outreach', prompt: `Write an outreach message to a FSBO seller at ${address}. The goal is to build a relationship, not pitch immediately. Offer something of value such as a free market report or showing tips. Position ${agent} as a resource, not a threat. Keep it under 150 words.\n\n${ctx}` },
    { id: 'seller_update', label: 'Seller Update Email', prompt: `Write a weekly seller update email to ${firstName} about their active listing at ${address}. Include sections for showing activity (placeholder numbers), market feedback summary (placeholder), and next steps. Honest and reassuring. From ${agent} at ${brokerage}.\n\n${ctx}` },
  ]
}
