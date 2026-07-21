'use client'

import { useState } from 'react'
import GeneratorShell from '@/components/generators/GeneratorShell'
import ContentForm from '@/components/forms/ContentForm'

const defaults = {
  content_type: 'fb_post', topic: '', audience: '',
}

export default function ContentPage() {
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Content Generator"
      description="Pick a content type, describe your topic, and get copy-paste ready social content."
      generatorType="content"
      promptInput={inputs as unknown as Record<string, string | boolean | number>}
    >
      <ContentForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
