'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSettings } from '@/hooks/useSettings'
import GeneratorShell from '@/components/generators/GeneratorShell'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { Task, OutputTab } from '@/types'

const TEMPLATES = [
  { value: 'new_buyer', label: 'New Buyer Lead' },
  { value: 'new_seller', label: 'New Seller Lead' },
  { value: 'new_listing', label: 'New Listing Launch' },
  { value: 'pending_transaction', label: 'Pending Transaction' },
  { value: 'open_house_followup', label: 'Open House Follow-Up' },
  { value: 'new_recruit', label: 'New Agent Recruit' },
  { value: 'weekly_accountability', label: 'Weekly Accountability' },
  { value: 'va_handoff', label: 'VA Handoff for Dan' },
]

const PRIORITY_COLORS: Record<string, 'red' | 'yellow' | 'blue' | 'slate'> = {
  urgent: 'red', high: 'yellow', medium: 'blue', low: 'slate',
}

export default function TasksPage() {
  const { settings } = useSettings()
  const [activeTab, setActiveTab] = useState<'board' | 'generate'>('board')
  const [tasks, setTasks] = useState<Task[]>([])
  const [outputs, setOutputs] = useState<OutputTab[]>([])
  const [inputs, setInputs] = useState({
    template: 'new_buyer', client_name: '', address: '', price: '',
    recruit_name: '', market_area: '', tasks: '', priority: 'normal',
  })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('tasks').select('*').eq('completed', false)
      .order('due_date').then(({ data }) => { if (data) setTasks(data as Task[]) })
  }, [])

  async function toggleTask(id: string) {
    await supabase.from('tasks').update({ completed: true }).eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const set = (k: string, v: string) => setInputs(prev => ({ ...prev, [k]: v }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Tasks</h1>

      <div className="flex gap-2">
        {(['board', 'generate'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {tab === 'board' ? 'Task Board' : 'Generate Template'}
          </button>
        ))}
      </div>

      {activeTab === 'board' && (
        <Card>
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                  <input type="checkbox" onChange={() => toggleTask(task.id)} className="w-4 h-4 accent-sky-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{task.title}</p>
                    {task.due_date && <p className="text-xs text-slate-400">Due {task.due_date}</p>}
                  </div>
                  <Badge color={PRIORITY_COLORS[task.priority] ?? 'slate'}>{task.priority}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">No open tasks. You are all caught up.</p>
          )}
        </Card>
      )}

      {activeTab === 'generate' && (
        <GeneratorShell
          title="Task Template Generator"
          description="Pick a template and get a full step-by-step task checklist."
          generatorType="task"
          promptInput={inputs}
          settings={settings ?? {}}
          outputTabs={outputs}
          setOutputTabs={setOutputs}
        >
          <div className="space-y-4">
            <Select label="Task Template" value={inputs.template} onChange={e => set('template', e.target.value)} options={TEMPLATES} />
            {(inputs.template === 'new_buyer' || inputs.template === 'new_seller') && (
              <Input label="Client Name" value={inputs.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Sarah Johnson" />
            )}
            {(inputs.template === 'new_listing' || inputs.template === 'pending_transaction' || inputs.template === 'open_house_followup') && (
              <Input label="Property Address" value={inputs.address} onChange={e => set('address', e.target.value)} placeholder="123 Lakeview Dr" />
            )}
            {inputs.template === 'new_listing' && (
              <Input label="List Price" value={inputs.price} onChange={e => set('price', e.target.value)} placeholder="$349,000" />
            )}
            {inputs.template === 'new_recruit' && (
              <Input label="Agent Name" value={inputs.recruit_name} onChange={e => set('recruit_name', e.target.value)} placeholder="Jamie Nelson" />
            )}
            {inputs.template === 'va_handoff' && (
              <>
                <Textarea label="Tasks for Dan" value={inputs.tasks} onChange={e => set('tasks', e.target.value)} placeholder="Follow up with open house leads, update CRM, schedule lender call..." rows={4} />
                <Select label="Priority" value={inputs.priority} onChange={e => set('priority', e.target.value)} options={[
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'high', label: 'High' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'low', label: 'Low' },
                ]} />
              </>
            )}
          </div>
        </GeneratorShell>
      )}
    </div>
  )
}
