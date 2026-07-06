import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({ label, className, ...props }: Props) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <input
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
        {...props}
      />
    </div>
  )
}
