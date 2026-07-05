'use client'

import { useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import GeneratorShell from '@/components/generators/GeneratorShell'
import SellerForm from '@/components/forms/SellerForm'
import type { OutputTab } from '@/types'

const defaults = {
  first_name: '', last_name: '', phone: '',
  address: '', city: '', situation: '', timeline: 'Flexible', notes: '',
}

export default function SellersPage() {
  const { settings } = useSettings()
  const [outputs, setOutputs] = useState<OutputTab[]>([])
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Seller Message Generator"
      description="Enter seller details and generate 7 ready-to-send messages and scripts."
      generatorType="seller"
      promptInput={inputs}
      settings={settings ?? {}}
      outputTabs={outputs}
      setOutputTabs={setOutputs}
    >
      <SellerForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
