import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserSSRClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Singleton instance for browser with SSR support
let supabaseSSRClient: ReturnType<typeof createSupabaseBrowserSSRClient> | null = null

export function getSupabaseBrowserSSRClient() {
  if (!supabaseSSRClient) {
    supabaseSSRClient = createSupabaseBrowserSSRClient()
  }
  return supabaseSSRClient
}