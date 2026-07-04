import type { UserSettings } from '@/types'

type Inputs = Record<string, string | boolean | number>

export function buildBuyerPrompt(inputs: Inputs, settings: Partial<UserSettings>) {
  const agent = settings.agent_name ?? 'Malcolm Wallaker'
  const brokerage = settings.brokerage_name ?? 'Pemberton Real Estate'
  const lenders = settings.preferred_lenders?.join(', ') ?? '[preferred lender name]'

  const ctx = `Buyer: ${inputs.first_name} ${inputs.last_name}
Phone: ${inputs.phone ?? 'unknown'}
Market: ${inputs.market_area ?? 'Northern Minnesota'}
Price Range: ${inputs.price_range ?? 'unknown'}
Lead Source: ${inputs.lead_source ?? 'unknown'}
Notes: ${inputs.notes ?? 'none'}
Agent: ${agent}, ${brokerage}`

  return [
    { id: 'first_text', label: 'First Response Text', prompt: `Write a friendly, brief first text message response to a new buyer inquiry. From ${agent}. Personal, not template-sounding. Under 3 sentences. Introduce yourself, acknowledge their interest, and ask one qualifying question.\n\n${ctx}` },
    { id: 'followup_text', label: 'Follow-Up Text', prompt: `Write a follow-up text for a buyer who has not responded in 2 to 3 days. Light, no pressure. Remind them who you are and offer value. Under 3 sentences.\n\n${ctx}` },
    { id: 'showing_confirm', label: 'Showing Confirmation', prompt: `Write a showing confirmation text for ${inputs.first_name}. Include date and time placeholders, address placeholder, and a note to text if anything changes. From ${agent}.\n\n${ctx}` },
    { id: 'consult_invite', label: 'Buyer Consult Invite', prompt: `Write a text or short email inviting ${inputs.first_name} to a free buyer consultation with ${agent}. Explain the value in 2 to 3 sentences without being salesy. Include a call to action.\n\n${ctx}` },
    { id: 'lender_referral', label: 'Lender Referral', prompt: `Write a text to ${inputs.first_name} recommending they get pre-approved and introducing a trusted local lender (${lenders}). Keep it helpful, not pushy. From ${agent} at ${brokerage}.\n\n${ctx}` },
    { id: 'buyer_agreement', label: 'Buyer Agreement Explanation', prompt: `Write a plain-language explanation of a buyer representation agreement to send to ${inputs.first_name} before signing. Explain what it is, why it protects them, and what it means for their relationship with ${agent}. Friendly, no legal jargon.\n\n${ctx}` },
    { id: 'cold_reactivation', label: 'Cold Reactivation', prompt: `Write a re-engagement text to ${inputs.first_name}, a buyer lead who went cold several months ago. Casual check-in, no desperation, mention something relevant about the current market in ${inputs.market_area ?? 'Northern Minnesota'}. From ${agent}.\n\n${ctx}` },
  ]
}
