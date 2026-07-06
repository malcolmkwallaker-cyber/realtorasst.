'use client'

import { useState } from 'react'
import GeneratorShell from '@/components/generators/GeneratorShell'
import SellerForm from '@/components/forms/SellerForm'

const defaults = {
  first_name: '', last_name: '', phone: '',
  address: '', city: '', situation: '', timeline: 'Flexible', notes: '',
}

export default function SellersPage() {
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Seller Message Generator"
      description="Enter seller details and generate 7 ready-to-send messages and scripts."
      generatorType="seller"
      promptInput={inputs as unknown as Record<string, string | boolean | number>}
    >
      <SellerForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
