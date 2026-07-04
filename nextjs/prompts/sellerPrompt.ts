import type { UserSettings } from '@/types'

type Inputs = Record<string, string | boolean | number>

export function buildSellerPrompt(inputs: Inputs, settings: Partial<UserSettings>) {
  const agent = settings.agent_name ?? 'Malcolm Wallaker'
  const brokerage = settings.brokerage_name ?? 'Pemberton Real Estate'

  const ctx = `Seller: ${inputs.first_name} ${inputs.last_name}
Property: ${inputs.address ?? 'their property'}, ${inputs.city ?? 'Northern MN'}
Situation: ${inputs.situation ?? 'general'}
Timeline: ${inputs.timeline ?? 'unknown'}
Notes: ${inputs.notes ?? 'none'}
Agent: ${agent}, ${brokerage}`

  return [
    { id: 'cma_followup', label: 'CMA Follow-Up', prompt: `Write a follow-up email to ${inputs.first_name} after delivering a CMA. Thank them for their time, summarize the key takeaway in one sentence, and invite them to a 15-minute call to answer questions. Professional but warm. From ${agent}.\n\n${ctx}` },
    { id: 'listing_confirm', label: 'Listing Appt Confirmation', prompt: `Write a listing appointment confirmation text to ${inputs.first_name}. Include date and time placeholder, address, what to expect during the appointment, and that ${agent} is looking forward to it.\n\n${ctx}` },
    { id: 'prelisting_checklist', label: 'Pre-Listing Checklist', prompt: `Write a pre-listing preparation checklist to send to ${inputs.first_name} as they prepare their home for sale. Include tasks for decluttering, repairs, curb appeal, and what to expect. Make it encouraging, not overwhelming. From ${agent} at ${brokerage}.\n\n${ctx}` },
    { id: 'price_reduction', label: 'Price Reduction Script', prompt: `Write a phone call script ${agent} can use to have the price reduction conversation with ${inputs.first_name}. Acknowledge the situation, reference market data (use placeholder for actual stats), present it as a strategic move, handle the likely objection that they need a specific amount, and guide toward a decision. Natural dialogue, not robotic.\n\n${ctx}` },
    { id: 'expired_outreach', label: 'Expired Listing Outreach', prompt: `Write an outreach letter or email to ${inputs.first_name}, whose listing just expired with another agent. Sympathetic, not predatory. Position ${agent} and ${brokerage} as the fresh start they need. Focus on what will be done differently. No negative remarks about the previous agent.\n\n${ctx}` },
    { id: 'fsbo_outreach', label: 'FSBO Outreach', prompt: `Write an outreach message to a FSBO seller at ${inputs.address ?? 'their property'}. The goal is to build a relationship, not pitch immediately. Offer something of value such as a free market report or showing tips. Position ${agent} as a resource, not a threat. Keep it under 150 words.\n\n${ctx}` },
    { id: 'seller_update', label: 'Seller Update Email', prompt: `Write a weekly seller update email to ${inputs.first_name} about their active listing at ${inputs.address ?? 'their property'}. Include sections for showing activity (placeholder numbers), market feedback summary (placeholder), and next steps. Honest and reassuring. From ${agent} at ${brokerage}.\n\n${ctx}` },
  ]
}
