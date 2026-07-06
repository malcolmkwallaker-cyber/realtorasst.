'use client'

import { useState } from 'react'
import GeneratorShell from '@/components/generators/GeneratorShell'
import ListingForm from '@/components/forms/ListingForm'

const defaults = {
  address: '', city: '', list_price: '', property_type: 'Single Family',
  beds: '', baths: '', square_feet: '', acres: '',
  lake_name: '', waterfront: false, key_features: '', description: '',
}

export default function ListingsPage() {
  const [inputs, setInputs] = useState(defaults)

  return (
    <GeneratorShell
      title="Listing Content Generator"
      description="Fill in the property details and generate 10 pieces of copy-paste ready marketing content."
      generatorType="listing"
      promptInput={inputs as unknown as Record<string, string | boolean | number>}
    >
      <ListingForm values={inputs} onChange={setInputs} />
    </GeneratorShell>
  )
}
