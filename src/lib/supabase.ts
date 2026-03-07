import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigValid = Boolean(supabaseUrl && supabaseAnonKey)

function buildAuthStorageKey() {
  const mode = import.meta.env.MODE || 'unknown'
  if (!supabaseUrl) return `sundown-hq-auth:${mode}:missing-url`
  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    return `sundown-hq-auth:${mode}:${projectRef}`
  } catch {
    return `sundown-hq-auth:${mode}:invalid-url`
  }
}

if (!supabaseConfigValid) {
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  )
}

// Use sessionStorage so the session lives only while the browser/tab is open.
// Closing the browser or tab clears the session and forces a fresh login next visit.
const sessionStorage = typeof window !== 'undefined' ? window.sessionStorage : undefined

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storageKey: buildAuthStorageKey(),
      storage: sessionStorage,
    },
  }
)
