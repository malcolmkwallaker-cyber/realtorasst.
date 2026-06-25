'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserSettings } from '@/types'

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('user_settings').select('*').single().then(({ data }) => {
      if (data) setSettings(data)
    })
  }, [])

  return { settings }
}
