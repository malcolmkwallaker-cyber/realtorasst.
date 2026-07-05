'use client'

import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'

interface Values {
  address: string; city: string; list_price: string; property_type: string
  beds: string; baths: string; square_feet: string; acres: string
  lake_name: string; waterfront: boolean; key_features: string; description: string
}

interface Props {
  values: Values
  onChange: (v: Values) => void
}

const PROPERTY_TYPES = [
  { value: 'Single Family', label: 'Single Family' },
  { value: 'Lake Home', label: 'Lake Home' },
  { value: 'Condo/Townhome', label: 'Condo / Townhome' },
  { value: 'Cabin', label: 'Cabin' },
  { value: 'Multi-Family', label: 'Multi-Family' },
  { value: 'Land', label: 'Land' },
  { value: 'Commercial', label: 'Commercial' },
]

export default function ListingForm({ values, onChange }: Props) {
  const set = (k: keyof Values, v: string | boolean) => onChange({ ...values, [k]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="Street Address" value={values.address} onChange={e => set('address', e.target.value)} placeholder="123 Lakeview Dr" className="sm:col-span-2" />
      <Input label="City" value={values.city} onChange={e => set('city', e.target.value)} placeholder="Grand Rapids" />
      <Input label="List Price" value={values.list_price} onChange={e => set('list_price', e.target.value)} placeholder="349000" type="number" />
      <Select label="Property Type" value={values.property_type} onChange={e => set('property_type', e.target.value)} options={PROPERTY_TYPES} />
      <Input label="Beds" value={values.beds} onChange={e => set('beds', e.target.value)} placeholder="3" type="number" />
      <Input label="Baths" value={values.baths} onChange={e => set('baths', e.target.value)} placeholder="2" type="number" />
      <Input label="Square Feet" value={values.square_feet} onChange={e => set('square_feet', e.target.value)} placeholder="1800" type="number" />
      <Input label="Acres" value={values.acres} onChange={e => set('acres', e.target.value)} placeholder="0.5" type="number" />
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" id="waterfront" checked={values.waterfront} onChange={e => set('waterfront', e.target.checked)} className="w-4 h-4 accent-sky-600" />
        <label htmlFor="waterfront" className="text-sm font-medium text-slate-700">Waterfront property</label>
      </div>
      {values.waterfront && (
        <Input label="Lake Name" value={values.lake_name} onChange={e => set('lake_name', e.target.value)} placeholder="Big Sand Lake" className="sm:col-span-2" />
      )}
      <Textarea label="Key Features" value={values.key_features} onChange={e => set('key_features', e.target.value)} placeholder="New roof, updated kitchen, attached garage, large deck, private dock..." rows={3} className="sm:col-span-2" />
      <Textarea label="Additional Notes" value={values.description} onChange={e => set('description', e.target.value)} placeholder="Anything else the AI should know about this property..." rows={3} className="sm:col-span-2" />
    </div>
  )
}
