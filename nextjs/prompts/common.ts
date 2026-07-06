import type { UserSettings } from '@/types'
import { DEFAULT_AGENT_NAME, DEFAULT_BROKERAGE_NAME, DEFAULT_VA_NAME, DEFAULT_MARKETS } from '@/lib/constants'

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
    agent: text(settings.agent_name, DEFAULT_AGENT_NAME),
    brokerage: text(settings.brokerage_name, DEFAULT_BROKERAGE_NAME),
    vaName: text(settings.va_name, DEFAULT_VA_NAME),
    markets: list(settings.primary_markets, DEFAULT_MARKETS.join(', ')),
  }
}
