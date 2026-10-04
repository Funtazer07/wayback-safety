import { supabase } from '../../lib/supabase.ts'

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

// Where the link in the email sends the user back to. Includes the subfolder on GitHub Pages.
function appUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

// Stored with the new account so the database can record when the user confirmed being 16 or older.
const signUpData = { age_confirmed: true }

/** Emails a login link. With isNewUser false, unknown email addresses are rejected. */
export async function sendLoginEmail(email: string, isNewUser: boolean) {
  const { error } = await client().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: appUrl(),
      shouldCreateUser: isNewUser,
      data: isNewUser ? signUpData : undefined,
    },
  })
  if (error) throw error
}

/** Returns true when the user still has to confirm their email address before being logged in. */
export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await client().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: appUrl(), data: signUpData },
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
