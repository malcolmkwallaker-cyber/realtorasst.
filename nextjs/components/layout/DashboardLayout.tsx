'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import type { UserSettings } from '@/types'

interface Props {
  children: React.ReactNode
  settings: UserSettings | null
}

export default function DashboardLayout({ children, settings }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(true)}
          agentName={settings?.agent_name ?? 'Malcolm'}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
