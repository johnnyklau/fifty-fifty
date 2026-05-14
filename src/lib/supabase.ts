import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// When env vars are absent (CI / local without .env.local), use placeholder values so
// the module loads without throwing. supabaseConfigured guards all actual API calls.
export const supabase = createClient(
  supabaseUrl || 'http://localhost',
  supabaseAnonKey || 'placeholder',
)
