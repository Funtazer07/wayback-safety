import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// null when the environment variables are missing, so the app shows a message instead of crashing.
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null
