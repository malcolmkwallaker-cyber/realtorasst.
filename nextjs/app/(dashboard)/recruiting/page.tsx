'use client'

import { useState } from 'react'
import GeneratorShell from '@/components/generators/GeneratorShell'
import RecruitingForm from '@/components/forms/RecruitingForm'

const defaults = {
  first_name: '', last_name: '', current_brokerage: '',
  years_experience: '', market_area: 'Grand Rapids',
  agent_type: 'experienced agent', notes: '',
}

export default function RecruitingPage() {
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Recruiting Message Generator"
      description="Enter agent details and generate 8 recruiting messages and scripts."
      generatorType="recruiting"
      promptInput={inputs as unknown as Record<string, string | boolean | number>}
    >
      <RecruitingForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
