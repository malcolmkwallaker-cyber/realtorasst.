import { cn } from '@/lib/utils'

const colors = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
}

interface Props {
  children: React.ReactNode
  color?: keyof typeof colors
  className?: string
}

export default function Badge({ children, color = 'slate', className }: Props) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  )
}
