import type { UserSettings } from '@/types'

type Inputs = Record<string, string | boolean | number>

export function buildContentPrompt(inputs: Inputs, settings: Partial<UserSettings>) {
  const agent = settings.agent_name ?? 'Malcolm Wallaker'
  const brokerage = settings.brokerage_name ?? 'Pemberton Real Estate'
  const markets = (settings.primary_markets ?? ['Northern Minnesota']).join(', ')

  const topic = inputs.topic as string ?? ''

  const ctx = `Topic: ${topic}
Agent: ${agent}, ${brokerage}
Markets: ${markets}
Audience: ${inputs.audience ?? `homeowners, buyers, and agents in ${markets}`}`

  const contentTypeMap: Record<string, { label: string; prompt: string }> = {
    fb_post: { label: 'Facebook Post', prompt: `Write a Facebook post for ${agent} about: ${topic}. 3 to 5 sentences. Conversational, adds value, has a question or call to action at the end. No hashtags.\n\n${ctx}` },
    realtor_edu: { label: 'Realtor Education Post', prompt: `Write an educational social media post for ${agent} aimed at first-time buyers or sellers in ${markets}. Teach one specific thing about: ${topic}. 4 to 6 sentences. Use plain language.\n\n${ctx}` },
    local_market: { label: 'Local Market Update', prompt: `Write a local market update social post for ${agent} covering the ${markets} area about: ${topic}. Include a stat or observation (use a placeholder if specific data is not available). Position ${agent} as the local expert.\n\n${ctx}` },
    lake_home: { label: 'Lake Home Post', prompt: `Write a lifestyle-focused social post about lake home living in Northern Minnesota, specifically about: ${topic}. From the perspective of ${agent} at ${brokerage}. Paint a picture and make people want to be there.\n\n${ctx}` },
    recruiting: { label: 'Recruiting Post', prompt: `Write a recruiting-focused social media post for ${agent} about building a career at ${brokerage}. Topic: ${topic}. Speak to experienced agents looking for more. No desperate energy, pure value.\n\n${ctx}` },
    testimonial: { label: 'Testimonial Request', prompt: `Write a text message from ${agent} to a past client asking for a Google review or testimonial. Warm, genuine, not transactional. Make it easy for them to say yes. Under 4 sentences.\n\n${ctx}` },
    funny: { label: 'Funny / Relatable Post', prompt: `Write a funny or relatable post about real estate agent life from ${agent}'s point of view. Topic angle: ${topic}. Authentic humor, not forced. 2 to 4 sentences. No self-deprecation that undermines credibility.\n\n${ctx}` },
    video_script: { label: 'Video Script', prompt: `Write a 60 to 90 second video script for ${agent} about: ${topic}. Conversational spoken language. Hook opener, 3 key points, strong close with a call to action. Formatted for teleprompter reading.\n\n${ctx}` },
    blog_outline: { label: 'Blog Outline', prompt: `Write a blog post outline for ${agent}'s website about: ${topic}. Include a title, meta description under 155 characters, intro paragraph, 4 to 5 section headers with bullet point sub-topics, and a conclusion with a call to action. SEO-friendly for ${markets} real estate searches.\n\n${ctx}` },
  }

  const selectedType = (inputs.content_type as string) ?? 'fb_post'
  const selected = contentTypeMap[selectedType] ?? contentTypeMap['fb_post']

  return [{ id: selectedType, label: selected.label, prompt: selected.prompt }]
}
