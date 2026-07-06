'use client'

import { useEffect, useRef, useState } from 'react'
import Button from '@/components/ui/Button'
import CopyButton from '@/components/ui/CopyButton'
import { Sparkles } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  { label: 'Plan my day', prompt: 'Plan my day. Here is what I have going on: ' },
  { label: 'VA handoff', prompt: 'Write a VA handoff brief for these tasks: ' },
  { label: 'New agent how-to', prompt: 'Write a how-to guide for a new agent on: ' },
  { label: 'Draft a message', prompt: 'Draft a message to a client about: ' },
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send() {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'The assistant is unavailable right now.')
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try sending that again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800">AI Assistant</h1>
        <p className="text-slate-500 text-sm mt-1">
          Your business partner for daily planning, VA handoffs, drafts, and anything in between.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <Sparkles className="w-8 h-8 text-sky-500 mx-auto mb-3" />
            <p className="text-slate-600 text-sm mb-4">
              Ask anything, or start from one of these.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => {
                    setInput(prompt)
                    inputRef.current?.focus()
                  }}
                  className="px-3 py-1.5 text-sm rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="bg-sky-600 text-white rounded-xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
              </div>
            </div>
          ) : (
            <div key={i} className="bg-white border border-slate-200 rounded-xl rounded-bl-sm p-4 max-w-[95%]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">Assistant</span>
                <CopyButton text={msg.content} />
              </div>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{msg.content}</pre>
            </div>
          )
        )}

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl rounded-bl-sm p-4 w-fit">
            <p className="text-sm text-slate-400">Thinking...</p>
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask for a plan, a draft, a script, a checklist..."
          className="flex-1 resize-none text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
        />
        <Button onClick={send} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  )
}
