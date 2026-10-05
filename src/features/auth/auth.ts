import { supabase } from '../../lib/supabase.ts'

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

// Where Google (or the link in a confirmation email) sends the user back to. Includes the
// subfolder on GitHub Pages.
function appUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

/** Leaves the app for the Google sign-in page. The user comes back logged in. */
export async function signInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: appUrl() },
  })
  if (error) throw error
}

/** Returns true when the user still has to confirm their email address before being logged in. */
export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: appUrl() },
  })
  if (error) throw error
  return data.session === null
}

export async function logInWithPassword(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function logOut() {
  const { error } = await client().auth.signOut()
  if (error) throw error
}
