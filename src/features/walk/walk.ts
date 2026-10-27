import { supabase } from '../../lib/supabase.ts'
import type { LngLat } from '../map/geometry.ts'

export type Walk = {
  id: string
  destinationLabel: string
  startedAt: Date
  /** Set by the server, so it is the same on every device. */
  deadline: Date
  status: 'active' | 'safe' | 'overdue' | 'cancelled'
  /** When the server sent "Are you OK?". The grace period counts from here. */
  warnedAt?: Date | null
  checkedInAt?: Date | null
}

export type NewWalk = {
  destinationLabel: string
  latitude?: number
  longitude?: number
  /** The server adds this to its own clock to get the deadline. */
  minutes: number
  contactIds?: string[]
}

type WalkRow = {
  id: string
  destination_label: string
  started_at: string
  deadline: string
  status: Walk['status']
  warned_at: string | null
  checked_in_at: string | null
}

const walkColumns = 'id, destination_label, started_at, deadline, status, warned_at, checked_in_at'

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

function toWalk(row: WalkRow): Walk {
  return {
    id: row.id,
    destinationLabel: row.destination_label,
    startedAt: new Date(row.started_at),
    deadline: new Date(row.deadline),
    status: row.status,
    warnedAt: row.warned_at ? new Date(row.warned_at) : null,
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at) : null,
  }
}

/** Fails when the user already has an active walk. */
export async function startWalk(newWalk: NewWalk): Promise<Walk> {
  const { data, error } = await client().rpc('start_walk', {
    label: newWalk.destinationLabel,
    minutes: newWalk.minutes,
    lat: newWalk.latitude,
    lng: newWalk.longitude,
    contact_ids: newWalk.contactIds,
  })
  if (error) throw error
  return toWalk(data)
}

/** The server keeps the route only while the walk is on the way. */
export async function shareWalkRoute(walkId: string, coordinates: LngLat[]): Promise<void> {
  const { error } = await client().rpc('share_walk_route', {
    walk_id: walkId,
    route: coordinates,
  })
  if (error) throw error
}

/** The server keeps only this last location, never a trail. */
export async function updateWalkLocation(
  walkId: string,
  latitude: number,
  longitude: number,
): Promise<Walk> {
  const { data, error } = await client().rpc('update_walk_location', {
    walk_id: walkId,
    lat: latitude,
    lng: longitude,
  })
  if (error) throw error
  return toWalk(data)
}

export async function checkInWalk(walkId: string): Promise<Walk> {
  const { data, error } = await client().rpc('check_in', { walk_id: walkId })
  if (error) throw error
  return toWalk(data)
}

/** Fails when the walk is over or the deadline would be more than 3 hours away. */
export async function extendWalk(walkId: string, minutes: number): Promise<Walk> {
  const { data, error } = await client().rpc('extend_walk', { walk_id: walkId, minutes })
  if (error) throw error
  return toWalk(data)
}

export async function cancelWalk(walkId: string): Promise<Walk> {
  const { data, error } = await client().rpc('cancel_walk', { walk_id: walkId })
  if (error) throw error
  return toWalk(data)
}

/** Overdue walks count too: the user must still be able to tap "I'm home". */
export async function fetchCurrentWalk(): Promise<Walk | null> {
  const { data, error } = await client()
    .from('walks')
    .select(walkColumns)
    .in('status', ['active', 'overdue'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? toWalk(data) : null
}

export async function fetchWalkContactNames(walkId: string): Promise<string[]> {
  const { data, error } = await client()
    .from('walk_contacts')
    .select('contacts(label)')
    .eq('walk_id', walkId)
  if (error) throw error
  // contacts is null when the contact was removed in the meantime.
  return (data as unknown as { contacts: { label: string } | null }[])
    .map((link) => link.contacts?.label)
    .filter((label): label is string => Boolean(label))
}

export type WalkContact = {
  id: string
  label: string
  status: 'invited' | 'accepted' | 'paused'
}

export async function fetchWalkContacts(walkId: string): Promise<WalkContact[]> {
  const { data, error } = await client()
    .from('walk_contacts')
    .select('contacts(id, label, status)')
    .eq('walk_id', walkId)
  if (error) throw error
  return (data as unknown as { contacts: WalkContact | null }[])
    .map((link) => link.contacts)
    .filter((contact): contact is WalkContact => contact !== null)
}

export async function fetchWalkWatchers(walkId: string): Promise<string[]> {
  const { data, error } = await client()
    .from('walk_contacts')
    .select('watching_at, contacts(label)')
    .eq('walk_id', walkId)
  if (error) throw error
  return (data as unknown as { watching_at: string | null; contacts: { label: string } | null }[])
    .filter((link) => link.watching_at !== null && link.contacts !== null)
    .sort((a, b) => (a.watching_at ?? '').localeCompare(b.watching_at ?? ''))
    .map((link) => link.contacts?.label ?? '')
}
