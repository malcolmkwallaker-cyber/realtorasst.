import { NextRequest, NextResponse } from 'next/server'
import { anthropic, REAL_ESTATE_SYSTEM } from '@/lib/anthropic'
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
    const body: GenerateRequest = await request.json()
    const { type, inputs, settings } = body

    const builder = BUILDERS[type as keyof typeof BUILDERS]
    if (!builder) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
    }

    const prompts = builder(inputs, settings)

    const results = await Promise.all(
      prompts.map(async ({ id, label, prompt }) => {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1500,
          system: REAL_ESTATE_SYSTEM,
          messages: [{ role: 'user', content: prompt }],
        })
        return {
          id,
          label,
          content: (message.content[0] as { type: 'text'; text: string }).text,
        }
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
