import { supabase } from '../../lib/supabase.ts'

export type Profile = {
  /** null until onboarding is done. */
  displayName: string | null
}

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await client()
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()
  if (error) throw error
  return { displayName: data.display_name }
}

/** Also records that the user confirmed being 16 or older. */
export async function completeProfile(userId: string, displayName: string) {
  const { error } = await client()
    .from('profiles')
    .update({ display_name: displayName, age_confirmed_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}
