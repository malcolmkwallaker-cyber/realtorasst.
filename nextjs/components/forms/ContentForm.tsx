'use client'

import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

const CONTENT_TYPES = [
  { value: 'fb_post', label: 'Facebook Post' },
  { value: 'realtor_edu', label: 'Realtor Education Post' },
  { value: 'local_market', label: 'Local Market Update' },
  { value: 'lake_home', label: 'Lake Home Lifestyle Post' },
  { value: 'recruiting', label: 'Recruiting Post' },
  { value: 'testimonial', label: 'Testimonial Request' },
  { value: 'funny', label: 'Funny / Relatable Post' },
  { value: 'video_script', label: 'Video Script' },
  { value: 'blog_outline', label: 'Blog Outline' },
]

interface Values {
  content_type: string; topic: string; audience: string
}
interface Props { values: Values; onChange: (v: Values) => void }

export default function ContentForm({ values, onChange }: Props) {
  const set = (k: keyof Values, v: string) => onChange({ ...values, [k]: v })
  return (
    <div className="space-y-4">
      <Select label="Content Type" value={values.content_type} onChange={e => set('content_type', e.target.value)} options={CONTENT_TYPES} />
      <Input label="Topic or Theme" value={values.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Why spring is a great time to sell in Northern Minnesota" />
      <Input label="Target Audience (optional)" value={values.audience} onChange={e => set('audience', e.target.value)} placeholder="e.g. First-time buyers in Grand Rapids" />
    </div>
  )
}
