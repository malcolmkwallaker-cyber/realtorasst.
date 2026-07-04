'use client'

import { useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import GeneratorShell from '@/components/generators/GeneratorShell'
import BuyerForm from '@/components/forms/BuyerForm'
import type { OutputTab } from '@/types'

const defaults = {
  first_name: '', last_name: '', phone: '',
  market_area: 'Grand Rapids', price_range: '', lead_source: 'Zillow', notes: '',
}

export default function BuyersPage() {
  const { settings } = useSettings()
  const [outputs, setOutputs] = useState<OutputTab[]>([])
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Buyer Message Generator"
      description="Enter buyer details and generate 7 ready-to-send messages."
      generatorType="buyer"
      promptInput={inputs}
      settings={settings ?? {}}
      outputTabs={outputs}
      setOutputTabs={setOutputs}
    >
      <BuyerForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
