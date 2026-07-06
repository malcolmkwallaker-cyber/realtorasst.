import { NextRequest, NextResponse } from 'next/server'
import { getAnthropic, buildAssistantSystemPrompt } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase/server'

const MAX_HISTORY = 30
const MAX_MESSAGE_CHARS = 20000

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
        if (m.content.length > MAX_MESSAGE_CHARS) {
          return NextResponse.json({ error: 'That message is too long. Split it into smaller pieces.' }, { status: 400 })
        }
        const last = history[history.length - 1]
        if (last && last.role === m.role) {
          last.content += '\n\n' + m.content
        } else {
          history.push({ role: m.role, content: m.content })
        }
      }
    }
    // The Messages API requires the first message to be a user turn;
    // trimming to the last N messages can otherwise leave an assistant
    // turn first and 400 every request in a long conversation.
    while (history.length > 0 && history[0].role !== 'user') {
      history.shift()
    }
    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'The last message must be from you.' }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('agent_name, brokerage_name, primary_markets, va_name, recruiting_value_prop')
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
