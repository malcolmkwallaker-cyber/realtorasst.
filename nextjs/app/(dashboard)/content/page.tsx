'use client'

import { useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import GeneratorShell from '@/components/generators/GeneratorShell'
import ContentForm from '@/components/forms/ContentForm'
import type { OutputTab } from '@/types'

const defaults = { content_type: 'fb_post', topic: '', audience: '' }

export default function ContentPage() {
  const { settings } = useSettings()
  const [outputs, setOutputs] = useState<OutputTab[]>([])
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Content Generator"
      description="Pick a content type, describe your topic, and get copy-paste ready social content."
      generatorType="content"
      promptInput={inputs}
      settings={settings ?? {}}
      outputTabs={outputs}
      setOutputTabs={setOutputs}
    >
      <ContentForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
