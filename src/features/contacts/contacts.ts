import { supabase } from '../../lib/supabase.ts'

export type Contact = {
  id: string
  label: string
  /** paused: still in the list, but follows no walks. */
  status: 'invited' | 'accepted' | 'paused'
  inviteExpiresAt: Date | null
  /** Missing for an open invite, or when the server could not be asked. */
  canReceiveAlerts?: boolean
}

export type Invite = {
  contactId: string
  link: string
  expiresAt: Date
}

export type InviteDetails = {
  inviterName: string
  expiresAt: Date
}

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

export function inviteLink(token: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  url.searchParams.set('invite', token)
  return url.toString()
}

export async function fetchContacts(userId: string): Promise<Contact[]> {
  // RLS also returns rows where the user is the contact; keep only the user's own list.
  const { data, error } = await client()
    .from('contacts')
    .select('id, label, status, invite_expires_at')
    .eq('user_id', userId)
    .order('created_at')
  if (error) throw error
  return data.map(toContact)
}

export async function fetchAlertStatus(): Promise<Map<string, boolean>> {
  const { data, error } = await client().rpc('contact_alert_status')
  if (error) throw error
  const rows = data as { contact_id: string; can_receive_alerts: boolean }[]
  return new Map(rows.map((row) => [row.contact_id, row.can_receive_alerts]))
}

/** The link works once, for 48 hours. */
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

export async function fetchInvite(token: string): Promise<InviteDetails> {
  const { data, error } = await client()
    .rpc('get_invite', { token })
    .single<{ inviter_name: string; expires_at: string }>()
  if (error) throw error
  return { inviterName: data.inviter_name, expiresAt: new Date(data.expires_at) }
}

export async function acceptInvite(token: string): Promise<void> {
  const { error } = await client().rpc('accept_invite', { token })
  if (error) throw error
}

export async function declineInvite(token: string): Promise<void> {
  const { error } = await client().rpc('decline_invite', { token })
  if (error) throw error
}

export async function setContactPaused(contactId: string, isPaused: boolean): Promise<Contact> {
  const { data, error } = await client().rpc('set_contact_paused', {
    contact_id: contactId,
    paused: isPaused,
  })
  if (error) throw error
  return toContact(data)
}

/** Also used by the contact to stop looking out for someone. */
export async function removeContact(contactId: string): Promise<void> {
  const { error } = await client().from('contacts').delete().eq('id', contactId)
  if (error) throw error
}
