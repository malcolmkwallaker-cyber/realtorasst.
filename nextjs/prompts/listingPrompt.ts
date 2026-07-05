import type { UserSettings } from '@/types'

type Inputs = Record<string, string | boolean | number>

export function buildListingPrompt(inputs: Inputs, settings: Partial<UserSettings>) {
  const agent = settings.agent_name ?? 'Malcolm Wallaker'
  const brokerage = settings.brokerage_name ?? 'Pemberton Real Estate'

  const ctx = `Property: ${inputs.address}, ${inputs.city}, MN
Price: $${inputs.list_price ?? 'TBD'}
Type: ${inputs.property_type ?? 'Residential'}
Beds: ${inputs.beds ?? '?'} | Baths: ${inputs.baths ?? '?'}
Sq Ft: ${inputs.square_feet ?? 'unknown'} | Acres: ${inputs.acres ?? 'N/A'}${inputs.waterfront ? `\nWaterfront: Yes, on ${inputs.lake_name ?? 'a lake'}` : ''}
Key Features: ${inputs.key_features ?? 'not provided'}
Additional Notes: ${inputs.description ?? 'none'}
Agent: ${agent}, ${brokerage}`

  return [
    { id: 'mls_desc', label: 'MLS Description', prompt: `Write a compelling MLS property description. Under 250 words. Lead with the most distinctive feature. Use specific details, not generic filler. End with a subtle call to action referencing ${agent} at ${brokerage}.\n\n${ctx}` },
    { id: 'fb_post', label: 'Facebook Post', prompt: `Write a Facebook post announcing this listing. 3 to 4 sentences. Conversational, like telling a friend about a great find. Include the price, city, and a clear next step to call or message ${agent}. No hashtags.\n\n${ctx}` },
    { id: 'ig_caption', label: 'Instagram Caption', prompt: `Write an Instagram caption for a photo of this property. 2 to 3 sentences. Punchy opener, key selling point, call to action. No hashtags.\n\n${ctx}` },
    { id: 'email_blast', label: 'Email Blast', prompt: `Write a short buyer email blast announcing this new listing. Include a subject line, 3 to 4 paragraph body, and a sign-off from ${agent} at ${brokerage}. Target buyers actively looking in this price range and area.\n\n${ctx}` },
    { id: 'fb_marketplace', label: 'FB Marketplace', prompt: `Write a Facebook Marketplace listing post. Include all key specs in a scannable format. Friendly but factual. End with contact info for ${agent}.\n\n${ctx}` },
    { id: 'video_script', label: 'Video Script', prompt: `Write a 60-second video walk-through script for ${agent} to record. Natural spoken language. Hit the best features in order from curb to close. End with a direct invitation to schedule a showing.\n\n${ctx}` },
    { id: 'hooks', label: '3 Video Hooks', prompt: `Write 3 different attention-grabbing video hooks (opening lines) for ${agent} to start a social media video about this listing. Each hook should be one or two sentences. Use three different angles: one leading with location, one with price value, one with lifestyle.\n\n${ctx}` },
    { id: 'buyer_avatar', label: 'Buyer Avatar', prompt: `Based on this property's features, price, and location, describe the ideal buyer in a short paragraph. Who are they, what life stage are they in, what are they looking for, and why does this home solve their problem? This is for ${agent}'s targeting strategy.\n\n${ctx}` },
    { id: 'selling_points', label: 'Top Selling Points', prompt: `List the top 5 selling points for this property. Each point should be one punchy sentence. Order them from most compelling to supporting. Write these for ${agent} to use in conversations with buyers.\n\n${ctx}` },
    { id: 'showing_instructions', label: 'Showing Instructions', prompt: `Write a professional showing instructions document for this listing. Include lockbox info placeholder, entry notes, pet/alarm notes placeholders, seller preferences, and a reminder to provide feedback to ${agent} at ${brokerage} after the showing.\n\n${ctx}` },
  ]
}
