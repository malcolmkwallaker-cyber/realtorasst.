'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { MARKET_OPTIONS } from '@/lib/constants'

const MARKETS = MARKET_OPTIONS

const SOURCES = [
  { value: 'Zillow', label: 'Zillow' },
  { value: 'Realtor.com', label: 'Realtor.com' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Open House', label: 'Open House' },
  { value: 'Cold Call', label: 'Cold Call' },
  { value: 'Other', label: 'Other' },
]

interface Values {
  first_name: string; last_name: string; phone: string
  market_area: string; price_range: string; lead_source: string; notes: string
}
interface Props { values: Values; onChange: (v: Values) => void }

export default function BuyerForm({ values, onChange }: Props) {
  const set = (k: keyof Values, v: string) => onChange({ ...values, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="First Name" value={values.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Sarah" />
      <Input label="Last Name" value={values.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Johnson" />
      <Input label="Phone" value={values.phone} onChange={e => set('phone', e.target.value)} placeholder="218-555-0100" />
      <Input label="Price Range" value={values.price_range} onChange={e => set('price_range', e.target.value)} placeholder="$250k-$350k" />
      <Select label="Market Area" value={values.market_area} onChange={e => set('market_area', e.target.value)} options={MARKETS} />
      <Select label="Lead Source" value={values.lead_source} onChange={e => set('lead_source', e.target.value)} options={SOURCES} />
      <Textarea label="Notes" value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Pre-approved, looking for lake home, wants 3+ beds..." rows={3} className="sm:col-span-2" />
    </div>
  )
}
