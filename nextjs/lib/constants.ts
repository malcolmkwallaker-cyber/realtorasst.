export const DEFAULT_AGENT_NAME = 'Malcolm Wallaker'
export const DEFAULT_BROKERAGE_NAME = 'Pemberton Real Estate'
export const DEFAULT_VA_NAME = 'Dan'

export const DEFAULT_MARKETS = [
  'Grand Rapids', 'Itasca County', 'Iron Range', 'Duluth', 'Brainerd',
  'Ely', 'Babbitt', 'Tower', 'Orr', 'Cook', 'Walker', 'Aitkin',
]

export const MARKET_OPTIONS = [...DEFAULT_MARKETS, 'Lake Home Area']
  .map(m => ({ value: m, label: m }))

export const PRIORITY_COLORS: Record<string, 'red' | 'yellow' | 'blue' | 'slate'> = {
  urgent: 'red',
  high: 'yellow',
  medium: 'blue',
  low: 'slate',
}
