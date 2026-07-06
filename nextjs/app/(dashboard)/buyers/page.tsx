'use client'

import { useState } from 'react'
import GeneratorShell from '@/components/generators/GeneratorShell'
import BuyerForm from '@/components/forms/BuyerForm'

const defaults = {
  first_name: '', last_name: '', phone: '',
  market_area: 'Grand Rapids', price_range: '', lead_source: 'Zillow', notes: '',
}

export default function BuyersPage() {
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Buyer Message Generator"
      description="Enter buyer details and generate 7 ready-to-send messages."
      generatorType="buyer"
      promptInput={inputs as unknown as Record<string, string | boolean | number>}
    >
      <BuyerForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
