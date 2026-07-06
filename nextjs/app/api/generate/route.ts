import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, buildSystemPrompt } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'
import { buildListingPrompt } from '@/prompts/listingPrompt'
import { buildBuyerPrompt } from '@/prompts/buyerPrompt'
import { buildSellerPrompt } from '@/prompts/sellerPrompt'
import { buildRecruitingPrompt } from '@/prompts/recruitingPrompt'
import { buildContentPrompt } from '@/prompts/contentPrompt'
import { buildTaskPrompt } from '@/prompts/taskPrompt'
import type { GenerateRequest } from '@/types'

const BUILDERS = {
  listing: buildListingPrompt,
  buyer: buildBuyerPrompt,
  seller: buildSellerPrompt,
  recruiting: buildRecruitingPrompt,
  content: buildContentPrompt,
  task: buildTaskPrompt,
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to generate content.' }, { status: 401 })
    }

    const body: GenerateRequest = await request.json()
    const { type, inputs } = body

    const builder = BUILDERS[type as keyof typeof BUILDERS]
    if (!builder) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
      return NextResponse.json({ error: 'inputs must be an object of form fields.' }, { status: 400 })
    }
    if (JSON.stringify(inputs).length > 20000) {
      return NextResponse.json({ error: 'Inputs are too long. Trim the form fields.' }, { status: 400 })
    }

    // Settings are server state; never trust a client-supplied copy.
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const prompts = builder(inputs, settings ?? {})
    const anthropic = getAnthropic()
    const system = buildSystemPrompt(settings ?? {})

    const results = await Promise.all(
      prompts.map(async ({ id, label, prompt }) => {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          system,
          messages: [{ role: 'user', content: prompt }],
        })
        const block = message.content[0]
        let content = block?.type === 'text' ? block.text : ''
        if (message.stop_reason === 'max_tokens') {
          content += '\n\n[This output hit the length limit and may be incomplete. Generate again or trim the inputs.]'
        }
        return { id, label, content }
      })
    )

    return NextResponse.json({ outputs: results })
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
