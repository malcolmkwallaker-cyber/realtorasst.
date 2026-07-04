'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CopyButton from './CopyButton'
import Button from './Button'

interface Props {
  label: string
  content: string
  contentType: string
  promptInput: Record<string, unknown>
  relatedContactId?: string
  relatedPropertyId?: string
}

export default function OutputCard({ label, content, contentType, promptInput, relatedContactId, relatedPropertyId }: Props) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    await supabase.from('generated_content').insert({
      content_type: contentType,
      prompt_input: promptInput,
      output: content,
      related_contact_id: relatedContactId ?? null,
      related_property_id: relatedPropertyId ?? null,
    })
    setSaved(true)
    setSaving(false)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="font-semibold text-slate-700 text-sm">{label}</h3>
        <div className="flex gap-2">
          <CopyButton text={content} />
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saved || saving}>
            {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
    </div>
  )
}
