import { Menu } from 'lucide-react'

interface Props {
  onMenuToggle: () => void
  agentName: string
}

export default function Header({ onMenuToggle, agentName }: Props) {
  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <Menu className="w-5 h-5" />
      </button>
      <span className="text-sm text-slate-500 ml-auto">
        {agentName} &mdash; Pemberton Real Estate
      </span>
    </header>
  )
}
