'use client'

import { useState } from 'react'
import Tabs from '@/components/ui/Tabs'
import OutputCard from '@/components/ui/OutputCard'
import Button from '@/components/ui/Button'
import type { OutputTab, UserSettings } from '@/types'

interface Props {
  title: string
  description: string
  generatorType: string
  promptInput: Record<string, string | boolean | number>
  settings: Partial<UserSettings>
  children: React.ReactNode
  outputTabs: OutputTab[]
  setOutputTabs: (tabs: OutputTab[]) => void
  relatedContactId?: string
  relatedPropertyId?: string
}

export default function GeneratorShell({
  title, description, generatorType, promptInput, settings,
  children, outputTabs, setOutputTabs, relatedContactId, relatedPropertyId,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: generatorType, inputs: promptInput, settings }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      setOutputTabs(data.outputs)
      setActiveTab(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500 mt-1 text-sm">{description}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        {children}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Button onClick={handleGenerate} disabled={loading} size="lg">
          {loading ? 'Generating...' : 'Generate Content'}
        </Button>
      </div>

      {outputTabs.length > 0 && (
        <div className="space-y-4">
          {outputTabs.length > 1 && (
            <Tabs
              tabs={outputTabs.map(t => t.label)}
              activeIndex={activeTab}
              onChange={setActiveTab}
            />
          )}
          <OutputCard
            key={outputTabs[activeTab].id}
            label={outputTabs[activeTab].label}
            content={outputTabs[activeTab].content}
            contentType={`${generatorType}_${outputTabs[activeTab].id}`}
            promptInput={promptInput as Record<string, unknown>}
            relatedContactId={relatedContactId}
            relatedPropertyId={relatedPropertyId}
          />
        </div>
      )}
    </div>
  )
}
