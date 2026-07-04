'use client'

import { cn } from '@/lib/utils'

interface Props {
  tabs: string[]
  activeIndex: number
  onChange: (index: number) => void
}

export default function Tabs({ tabs, activeIndex, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            i === activeIndex
              ? 'bg-sky-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
