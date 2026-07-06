'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import { MARKET_OPTIONS } from '@/lib/constants'

const AGENT_TYPES = [
  { value: 'experienced agent', label: 'Experienced Agent' },
  { value: 'coachable new agent', label: 'Newer Agent (coachable)' },
  { value: 'broker-owner', label: 'Broker-Owner / Team Leader' },
]

const MARKETS = MARKET_OPTIONS

interface Values {
  first_name: string; last_name: string; current_brokerage: string
  years_experience: string; market_area: string; agent_type: string; notes: string
}
interface Props { values: Values; onChange: (v: Values) => void }

export default function RecruitingForm({ values, onChange }: Props) {
  const set = (k: keyof Values, v: string) => onChange({ ...values, [k]: v })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input label="First Name" value={values.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jamie" />
      <Input label="Last Name" value={values.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Nelson" />
      <Input label="Current Brokerage" value={values.current_brokerage} onChange={e => set('current_brokerage', e.target.value)} placeholder="RE/MAX" />
      <Input label="Years in Real Estate" value={values.years_experience} onChange={e => set('years_experience', e.target.value)} placeholder="5" type="number" />
      <Select label="Market Area" value={values.market_area} onChange={e => set('market_area', e.target.value)} options={MARKETS} />
      <Select label="Agent Type" value={values.agent_type} onChange={e => set('agent_type', e.target.value)} options={AGENT_TYPES} />
      <Textarea label="Notes" value={values.notes} onChange={e => set('notes', e.target.value)} placeholder="Top producer, specializes in lake homes, seems unhappy at current brokerage..." rows={3} className="sm:col-span-2" />
    </div>
  )
}
