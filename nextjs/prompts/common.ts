import type { UserSettings } from '@/types'

export type Inputs = Record<string, string | boolean | number>

export interface PromptSpec {
  id: string
  label: string
  prompt: string
}

// Empty strings from form fields are "missing", not values; ?? alone misses them.
export function text(value: unknown, fallback: string): string {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

export function list(values: string[] | null | undefined, fallback: string): string {
  return values && values.length > 0 ? values.join(', ') : fallback
}

export function identity(settings: Partial<UserSettings>) {
  return {
    agent: text(settings.agent_name, 'Malcolm Wallaker'),
    brokerage: text(settings.brokerage_name, 'Pemberton Real Estate'),
    vaName: text(settings.va_name, 'your VA'),
    markets: list(settings.primary_markets, 'Northern Minnesota'),
  }
}
