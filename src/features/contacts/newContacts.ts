import { supabase } from '../../lib/supabase.ts'

/** Someone who just became a contact, for the card on Home. */
export type NewContact = {
  id: string
  label: string
  acceptedAt: Date
}

type NewContactRow = {
  id: string
  label: string
  accepted_at: string
}

// Assumption: 2 days covers "I accepted yesterday and open the app today", the same idea as the
// 48 hours an invite link works.
const NEW_FOR_MS = 2 * 24 * 60 * 60 * 1000

// Per phone on purpose: the Home Screen app on iPhone has its own storage, so the card also shows
// there after it was closed in the browser.
const storageKey = 'wayback.seenNewContacts'

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

/**
 * The user's contacts who accepted in the last 2 days. Both sides have their own row with the time
 * of accepting, so the one who invited and the one who accepted both get them.
 */
export async function fetchNewContacts(userId: string, now = new Date()): Promise<NewContact[]> {
  const { data, error } = await client()
    .from('contacts')
    .select('id, label, accepted_at')
    .eq('user_id', userId)
    .eq('status', 'accepted')
    .gt('accepted_at', new Date(now.getTime() - NEW_FOR_MS).toISOString())
    .order('accepted_at')
  if (error) throw error
  return (data as NewContactRow[]).map((row) => ({
    id: row.id,
    label: row.label,
    acceptedAt: new Date(row.accepted_at),
  }))
}

export function loadSeenContactIds(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveSeenContactIds(ids: string[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(ids))
  } catch {
    // Storage blocked: the card comes back next time, which is harmless.
  }
}

/** "Anna", "Anna and Sam", "Anna, Sam and Pat". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
