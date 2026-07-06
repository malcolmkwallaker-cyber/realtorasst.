import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PRIORITY_COLORS } from '@/lib/constants'
import { CheckSquare, Home, Users, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: tasks, count: taskCount },
    { count: listingCount },
    { count: contactCount },
    { count: contentCount },
    { data: settings },
  ] = await Promise.all([
    supabase.from('tasks').select('*', { count: 'exact' }).eq('completed', false).order('due_date').limit(5),
    supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('generated_content').select('*', { count: 'exact', head: true }),
    supabase.from('user_settings').select('agent_name, brokerage_name').maybeSingle(),
  ])

  const firstName = (settings?.agent_name ?? 'Malcolm').split(' ')[0]
  const brokerage = settings?.brokerage_name ?? 'Pemberton Real Estate'

  const stats = [
    { label: 'Open Tasks', value: taskCount ?? 0, icon: CheckSquare, href: '/tasks', color: 'text-sky-600' },
    { label: 'Active Listings', value: listingCount ?? 0, icon: Home, href: '/listings', color: 'text-emerald-600' },
    { label: 'Total Contacts', value: contactCount ?? 0, icon: Users, href: '/buyers', color: 'text-violet-600' },
    { label: 'Content Generated', value: contentCount ?? 0, icon: FileText, href: '/content', color: 'text-amber-600' },
  ]

  const quickLinks = [
    { href: '/assistant', label: 'Ask the AI Assistant', desc: 'Plan your day, VA handoffs, how-to guides, anything' },
    { href: '/listings', label: 'Generate Listing Content', desc: 'MLS desc, social posts, video scripts' },
    { href: '/buyers', label: 'Write Buyer Messages', desc: 'First response, follow-ups, confirmations' },
    { href: '/sellers', label: 'Write Seller Messages', desc: 'CMA follow-up, price reduction scripts' },
    { href: '/recruiting', label: 'Recruiting Outreach', desc: 'Cold DMs, call scripts, value props' },
    { href: '/content', label: 'Create Social Content', desc: 'Facebook, video scripts, blog outlines' },
    { href: '/tasks', label: 'Generate Task Templates', desc: 'Checklists for buyers, listings, VAs' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {firstName}.</h1>
        <p className="text-slate-500 text-sm mt-1">{brokerage}, Northern Minnesota</p>
      </div>

      <Link href="/assistant" className="block">
        <div className="bg-sidebar rounded-xl p-5 flex items-center gap-4 hover:opacity-95 transition-opacity">
          <Sparkles className="w-6 h-6 text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-white font-semibold text-sm">AI Assistant</p>
            <p className="text-slate-300 text-xs mt-0.5">Plan your day, hand off to your VA, or draft anything. Just ask.</p>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Icon className={`w-5 h-5 mb-2 ${color}`} />
              <p className="text-2xl font-bold text-slate-800">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-slate-700 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {quickLinks.map(({ href, label, desc }) => (
              <Link key={href} href={href} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-700 mb-4">Open Tasks</h2>
          {tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
                    {task.due_date && <p className="text-xs text-slate-400">Due {task.due_date}</p>}
                  </div>
                  <Badge color={PRIORITY_COLORS[task.priority] ?? 'slate'}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No open tasks. Go get some.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
