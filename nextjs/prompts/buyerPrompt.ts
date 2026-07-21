import type { UserSettings } from '@/types'
import { identity, list, text, type Inputs, type PromptSpec } from './common'

export function buildBuyerPrompt(inputs: Inputs, settings: Partial<UserSettings>): PromptSpec[] {
  const { agent, brokerage } = identity(settings)
  const lenders = list(settings.preferred_lenders, '[preferred lender name]')
  const firstName = text(inputs.first_name, '[First Name]')
  const market = text(inputs.market_area, 'Northern Minnesota')

  const ctx = `Buyer: ${firstName} ${text(inputs.last_name, '')}
Phone: ${text(inputs.phone, 'unknown')}
Market: ${market}
Price Range: ${text(inputs.price_range, 'unknown')}
Lead Source: ${text(inputs.lead_source, 'unknown')}
Notes: ${text(inputs.notes, 'none')}
Agent: ${agent}, ${brokerage}`

  return [
    { id: 'first_text', label: 'First Response Text', prompt: `Write a friendly, brief first text message response to a new buyer inquiry. From ${agent}. Personal, not template-sounding. Under 3 sentences. Introduce yourself, acknowledge their interest, and ask one qualifying question.\n\n${ctx}` },
    { id: 'followup_text', label: 'Follow-Up Text', prompt: `Write a follow-up text for a buyer who has not responded in 2 to 3 days. Light, no pressure. Remind them who you are and offer value. Under 3 sentences.\n\n${ctx}` },
    { id: 'showing_confirm', label: 'Showing Confirmation', prompt: `Write a showing confirmation text for ${firstName}. Include date and time placeholders, address placeholder, and a note to text if anything changes. From ${agent}.\n\n${ctx}` },
    { id: 'consult_invite', label: 'Buyer Consult Invite', prompt: `Write a text or short email inviting ${firstName} to a free buyer consultation with ${agent}. Explain the value in 2 to 3 sentences without being salesy. Include a call to action.\n\n${ctx}` },
    { id: 'lender_referral', label: 'Lender Referral', prompt: `Write a text to ${firstName} recommending they get pre-approved and introducing a trusted local lender (${lenders}). Keep it helpful, not pushy. From ${agent} at ${brokerage}.\n\n${ctx}` },
    { id: 'buyer_agreement', label: 'Buyer Agreement Explanation', prompt: `Write a plain-language explanation of a buyer representation agreement to send to ${firstName} before signing. Explain what it is, why it protects them, and what it means for their relationship with ${agent}. Friendly, no legal jargon.\n\n${ctx}` },
    { id: 'cold_reactivation', label: 'Cold Reactivation', prompt: `Write a re-engagement text to ${firstName}, a buyer lead who went cold several months ago. Casual check-in, no desperation, mention something relevant about the current market in ${market}. From ${agent}.\n\n${ctx}` },
  ]
}
