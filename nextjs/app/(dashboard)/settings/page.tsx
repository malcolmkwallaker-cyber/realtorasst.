'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { DEFAULT_AGENT_NAME, DEFAULT_BROKERAGE_NAME, DEFAULT_VA_NAME, DEFAULT_MARKETS } from '@/lib/constants'

const DEFAULTS = {
  agent_name: DEFAULT_AGENT_NAME,
  brokerage_name: DEFAULT_BROKERAGE_NAME,
  phone: '',
  email: '',
  website: '',
  default_tone: 'friendly, local, and confident',
  primary_markets: DEFAULT_MARKETS.join(', '),
  recruiting_value_prop: 'I help agents grow through better systems, stronger support, lead generation, social media, AI tools, training, and a collaborative office culture.',
  preferred_lenders: '',
  va_name: DEFAULT_VA_NAME,
}

export default function SettingsPage() {
  const [form, setForm] = useState(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('user_settings').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setForm({
          agent_name: data.agent_name ?? DEFAULTS.agent_name,
          brokerage_name: data.brokerage_name ?? DEFAULTS.brokerage_name,
          phone: data.phone ?? '',
          email: data.email ?? '',
          website: data.website ?? '',
          default_tone: data.default_tone ?? DEFAULTS.default_tone,
          primary_markets: (data.primary_markets ?? []).join(', '),
          recruiting_value_prop: data.recruiting_value_prop ?? DEFAULTS.recruiting_value_prop,
          preferred_lenders: (data.preferred_lenders ?? []).join(', '),
          va_name: data.va_name ?? DEFAULT_VA_NAME,
        })
      }
    })
  }, [])

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Your session expired. Refresh the page and sign in again.')
        return
      }
      const { error: upsertError } = await supabase.from('user_settings').upsert({
        user_id: user.id,
        agent_name: form.agent_name,
        brokerage_name: form.brokerage_name,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        default_tone: form.default_tone,
        primary_markets: form.primary_markets.split(',').map(s => s.trim()).filter(Boolean),
        recruiting_value_prop: form.recruiting_value_prop || null,
        preferred_lenders: form.preferred_lenders.split(',').map(s => s.trim()).filter(Boolean),
        va_name: form.va_name || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      if (upsertError) {
        setError(`Save failed: ${upsertError.message}`)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">These values are used to personalize every AI output.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-700">Agent Info</h2>
        <Input label="Your Name" value={form.agent_name} onChange={e => set('agent_name', e.target.value)} />
        <Input label="Brokerage Name" value={form.brokerage_name} onChange={e => set('brokerage_name', e.target.value)} />
        <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="218-555-0100" />
        <Input label="Email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="malcolm@pembertonrealestate.com" />
        <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://pembertonrealestate.com" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-slate-700">Content Preferences</h2>
        <Input label="Default Tone" value={form.default_tone} onChange={e => set('default_tone', e.target.value)} placeholder="friendly, local, and confident" />
        <Textarea label="Primary Markets (comma separated)" value={form.primary_markets} onChange={e => set('primary_markets', e.target.value)} rows={2} />
        <Textarea label="Recruiting Value Proposition" value={form.recruiting_value_prop} onChange={e => set('recruiting_value_prop', e.target.value)} rows={3} />
        <Input label="Preferred Lenders (comma separated)" value={form.preferred_lenders} onChange={e => set('preferred_lenders', e.target.value)} placeholder="Tom Smith, Lisa Brown" />
        <Input label="VA Name" value={form.va_name} onChange={e => set('va_name', e.target.value)} placeholder="Dan" />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      <Button onClick={handleSave} disabled={saving} size="lg">
        {saved ? 'Settings Saved' : saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  )
}
