'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Home, Users, UserCheck, UserPlus,
  FileText, CheckSquare, Settings, X, Building2, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { href: '/listings', label: 'Listings', icon: Home },
  { href: '/buyers', label: 'Buyers', icon: Users },
  { href: '/sellers', label: 'Sellers', icon: UserCheck },
  { href: '/recruiting', label: 'Recruiting', icon: UserPlus },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-30 w-64 bg-sidebar flex flex-col transition-transform duration-200',
      'lg:relative lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full'
    )}>
      <div className="flex items-center justify-between p-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Building2 className="text-sky-400 w-6 h-6 flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Pemberton AI</p>
            <p className="text-slate-400 text-xs">Northern Minnesota</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-700">
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
