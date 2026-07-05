'use client'

import { useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import GeneratorShell from '@/components/generators/GeneratorShell'
import RecruitingForm from '@/components/forms/RecruitingForm'
import type { OutputTab } from '@/types'

const defaults = {
  first_name: '', last_name: '', current_brokerage: '',
  years_experience: '', market_area: 'Grand Rapids',
  agent_type: 'experienced agent', notes: '',
}

export default function RecruitingPage() {
  const { settings } = useSettings()
  const [outputs, setOutputs] = useState<OutputTab[]>([])
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Recruiting Message Generator"
      description="Enter agent details and generate 8 recruiting messages and scripts."
      generatorType="recruiting"
      promptInput={inputs}
      settings={settings ?? {}}
      outputTabs={outputs}
      setOutputTabs={setOutputs}
    >
      <RecruitingForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
