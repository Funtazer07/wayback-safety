import { supabase } from '../../lib/supabase.ts'

export type Contact = {
  id: string
  /** What the user calls this contact, for example "Mum". */
  label: string
  /** invited: the link is sent but nobody accepted it yet. paused: in the list, but follows no walks. */
  status: 'invited' | 'accepted' | 'paused'
  /** When an open invite stops working. Null once the invite is accepted. */
  inviteExpiresAt: Date | null
}

export type Invite = {
  contactId: string
  /** The link the user sends to the contact, for example in WhatsApp. */
  link: string
  expiresAt: Date
}

export type InviteDetails = {
  /** The name of the user who sent the invite, as they chose it in onboarding. */
  inviterName: string
  expiresAt: Date
}

// A row of the contacts table, as the database returns it. See supabase/migrations/0005_contacts.sql.
// Only the columns the app uses are listed.
type ContactRow = {
  id: string
  label: string
  status: Contact['status']
  invite_expires_at: string | null
}

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    label: row.label,
    status: row.status,
    inviteExpiresAt: row.invite_expires_at ? new Date(row.invite_expires_at) : null,
  }
}

/**
 * The link that opens the app with this invite. Built from BASE_URL because the live site runs in a
 * subfolder. Reading the invite from the link when the app opens is built in SCRUM-60.
 */
export function inviteLink(token: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  url.searchParams.set('invite', token)
  return url.toString()
}

/** The user's contacts and open invites, oldest first. */
export async function fetchContacts(userId: string): Promise<Contact[]> {
  // Row level security returns rows where the user is either side. The filter keeps only the
  // user's own contacts, not the people this user looks out for.
  const { data, error } = await client()
    .from('contacts')
    .select('id, label, status, invite_expires_at')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data.map(toContact)
}

/** Creates an invite link for a new contact. The link works once, for 48 hours. */
export async function createInvite(label: string): Promise<Invite> {
  const { data, error } = await client().rpc('create_invite', { label }).single<{
    contact_id: string
    token: string
    expires_at: string
  }>()
  if (error) throw error
  return {
    contactId: data.contact_id,
    link: inviteLink(data.token),
    expiresAt: new Date(data.expires_at),
  }
}

/** Who sent the invite in this link. Fails when the link is unknown, used or expired. */
export async function fetchInvite(token: string): Promise<InviteDetails> {
  const { data, error } = await client()
    .rpc('get_invite', { token })
    .single<{ inviter_name: string; expires_at: string }>()
  if (error) throw error
  return { inviterName: data.inviter_name, expiresAt: new Date(data.expires_at) }
}

/** The logged-in user accepts the invite and starts looking out for the person who sent it. */
export async function acceptInvite(token: string): Promise<void> {
  const { error } = await client().rpc('accept_invite', { token })
  if (error) throw error
}

/** The logged-in user says no to the invite. It is deleted, so the sender sees it is gone. */
export async function declineInvite(token: string): Promise<void> {
  const { error } = await client().rpc('decline_invite', { token })
  if (error) throw error
}

/** Pauses a contact, or lets them follow walks again. Only for contacts who accepted. */
export async function setContactPaused(contactId: string, isPaused: boolean): Promise<Contact> {
  const { data, error } = await client().rpc('set_contact_paused', {
    contact_id: contactId,
    paused: isPaused,
  })
  if (error) throw error
  return toContact(data)
}

/**
 * Removes a contact or cancels an open invite. The contact can use this too, to stop looking out
 * for someone. The contact is also taken off the walks they followed.
 */
export async function removeContact(contactId: string): Promise<void> {
  const { error } = await client().from('contacts').delete().eq('id', contactId)
  if (error) throw error
}
