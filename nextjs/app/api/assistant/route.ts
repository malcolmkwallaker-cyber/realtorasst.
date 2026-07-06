import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, buildAssistantSystemPrompt } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

const MAX_HISTORY = 30

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to use the assistant.' }, { status: 401 })
    }

    const body = await request.json()
    const raw: unknown = body?.messages
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ error: 'messages is required.' }, { status: 400 })
    }

    const history: ChatMessage[] = []
    for (const m of raw.slice(-MAX_HISTORY)) {
      if ((m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string' && m.content.trim()) {
        const last = history[history.length - 1]
        if (last && last.role === m.role) {
          last.content += '\n\n' + m.content
        } else {
          history.push({ role: m.role, content: m.content })
        }
      }
    }
    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'The last message must be from you.' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const anthropic = getAnthropic()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: buildAssistantSystemPrompt(settings ?? {}),
      messages: history,
    })

    const block = message.content[0]
    let reply = block?.type === 'text' ? block.text : ''
    if (message.stop_reason === 'max_tokens') {
      reply += '\n\n[I hit the length limit. Say "continue" and I will pick up where I left off.]'
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('[assistant]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
