import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// null when the environment variables are missing (see .env.example), so the app can show a clear
// message instead of crashing on start.
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
