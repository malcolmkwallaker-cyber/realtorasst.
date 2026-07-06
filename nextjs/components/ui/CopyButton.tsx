'use client'

import { useState } from 'react'
import { Copy, Check, Link } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  text?: string
  url?: string
  label?: string
}

export default function CopyButton({ text, url, label }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const value = url ?? text ?? ''
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUrlMode = !!url
  const defaultLabel = isUrlMode ? 'Copy Link' : 'Copy'

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
        copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : isUrlMode ? <Link className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : label ?? defaultLabel}
    </button>
  )
}
