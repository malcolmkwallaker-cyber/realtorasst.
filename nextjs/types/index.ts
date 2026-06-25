export type ContactType = 'buyer' | 'seller' | 'agent_recruit' | 'referral_partner' | 'past_client'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Channel = 'email' | 'text' | 'call' | 'social_dm'
export type Direction = 'inbound' | 'outbound'
export type PropertyStatus = 'active' | 'pending' | 'sold' | 'withdrawn'

export interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  contact_type: ContactType
  lead_source: string | null
  market_area: string | null
  price_range: string | null
  notes: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  user_id: string
  address: string
  city: string
  state: string
  zip: string | null
  list_price: number | null
  property_type: string | null
  beds: number | null
  baths: number | null
  square_feet: number | null
  acres: number | null
  lake_name: string | null
  waterfront: boolean
  description: string | null
  key_features: string[]
  seller_id: string | null
  status: PropertyStatus
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  contact_id: string | null
  property_id: string | null
  category: string | null
  priority: Priority
  due_date: string | null
  completed: boolean
  assigned_to: string | null
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  contact_id: string | null
  channel: Channel
  direction: Direction
  message: string
  summary: string | null
  created_at: string
}

export interface GeneratedContent {
  id: string
  user_id: string
  content_type: string
  prompt_input: Record<string, unknown>
  output: string
  related_contact_id: string | null
  related_property_id: string | null
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  agent_name: string
  brokerage_name: string
  phone: string | null
  email: string | null
  website: string | null
  default_tone: string
  primary_markets: string[]
  recruiting_value_prop: string | null
  preferred_lenders: string[]
  va_name: string | null
  created_at: string
  updated_at: string
}

export type GeneratorType = 'listing' | 'buyer' | 'seller' | 'recruiting' | 'content' | 'task'

export interface GenerateRequest {
  type: GeneratorType
  inputs: Record<string, string | boolean | number>
  settings: Partial<UserSettings>
}

export interface OutputTab {
  id: string
  label: string
  content: string
}
