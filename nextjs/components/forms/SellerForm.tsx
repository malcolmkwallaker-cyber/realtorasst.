'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

const TIMELINES = [
  { value: 'ASAP', label: 'ASAP' },
  { value: '1-3 months', label: '1 to 3 months' },
  { value: '3-6 months', label: '3 to 6 months' },
  { value: '6-12 months', label: '6 to 12 months' },
  { value: 'Flexible', label: 'Flexible' },
]

interface Values {
  first_name: string; last_name: string; phone: string
  address: string; city: string; situation: string; timeline: string; notes: string
}
interface Props { values: Values; onChange: (v: Values) => void }

export default function SellerForm({ values, onChange }: Props) {
  const set = (k: keyof Values, v: string) => onChange({ ...values, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="First Name" value={values.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Tom" />
      <Input label="Last Name" value={values.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Anderson" />
      <Input label="Phone" value={values.phone} onChange={e => set('phone', e.target.value)} placeholder="218-555-0200" />
      <Input label="Property Address" value={values.address} onChange={e => set('address', e.target.value)} placeholder="456 Pine St" />
      <Input label="City" value={values.city} onChange={e => set('city', e.target.value)} placeholder="Ely" />
      <Select label="Timeline" value={values.timeline} onChange={e => set('timeline', e.target.value)} options={TIMELINES} />
      <Textarea label="Seller Situation" value={values.situation} onChange={e => set('situation', e.target.value)} placeholder="Retiring and downsizing, need to sell before buying next home..." rows={3} className="sm:col-span-2" />
      <Textarea label="Notes" value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Any other context..." rows={2} className="sm:col-span-2" />
    </div>
  )
}
