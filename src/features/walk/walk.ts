import { supabase } from '../../lib/supabase.ts'

export type Walk = {
  id: string
  /** What the user picked as destination, for example "Home". */
  destinationLabel: string
  startedAt: Date
  /** When the user should be home. Set by the server, so it is the same on every device. */
  deadline: Date
  status: 'active' | 'safe' | 'overdue' | 'cancelled'
  /**
   * When the server sent "Are you OK?" for this deadline (SCRUM-73). The grace period counts from
   * here. Null before the deadline; left out in tests and previews that do not need it.
   */
  warnedAt?: Date | null
  /** When the user checked in (0004). Null until then; left out in tests that do not need it. */
  checkedInAt?: Date | null
}

export type NewWalk = {
  destinationLabel: string
  /** Where the destination is. Left out while the user can only pick or type a name. */
  latitude?: number
  longitude?: number
  /** How long the walk may take. The server adds this to its own clock to get the deadline. */
  minutes: number
  contactIds?: string[]
}

// A row of the walks table, as the database returns it. See supabase/migrations/0003_walks.sql,
// 0004_check_in.sql, 0006_extend_and_cancel.sql and 0011_late_walks.sql. Only the columns the app
// uses are listed.
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

/** Starts a walk for the logged-in user. Fails when they already have an active walk. */
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

/**
 * Sends where the user is now. The server keeps only this last location, not a trail. Returns the
 * walk, so the caller sees the current deadline and status.
 */
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

/**
 * Tells the server the user is home. The server sets the walk to 'safe', which stops the timer,
 * and erases the last known location. Fails when the walk has already ended.
 */
export async function checkInWalk(walkId: string): Promise<Walk> {
  const { data, error } = await client().rpc('check_in', { walk_id: walkId })
  if (error) throw error
  return toWalk(data)
}

/**
 * Gives the user more time. The server adds the minutes to the deadline, or to now if the deadline
 * has passed, and returns the walk with the new deadline. Fails when the walk has ended or is
 * overdue, or when the deadline would be more than 3 hours away.
 */
export async function extendWalk(walkId: string, minutes: number): Promise<Walk> {
  const { data, error } = await client().rpc('extend_walk', { walk_id: walkId, minutes })
  if (error) throw error
  return toWalk(data)
}

/**
 * Stops the walk without a check-in, for example when the user gets a lift. The server sets it to
 * 'cancelled', which stops the timer, and erases the last known location. Fails when the walk has
 * already ended or is overdue.
 */
export async function cancelWalk(walkId: string): Promise<Walk> {
  const { data, error } = await client().rpc('cancel_walk', { walk_id: walkId })
  if (error) throw error
  return toWalk(data)
}

/**
 * The walk the logged-in user is on, or null. Use it to pick the timer up after reopening the app,
 * and to hear about changes the server made (the "Are you OK?" warning, overdue).
 *
 * An overdue walk counts too: the user has not checked in, and must still be able to tap "I'm home"
 * to tell their contacts they are safe (SCRUM-101). The newest one wins.
 */
export async function fetchCurrentWalk(): Promise<Walk | null> {
  // No user filter needed: row level security only returns the user's own walks.
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

/**
 * The names the user gave the contacts who follow this walk, for example ["Mum", "Alex"]. Empty
 * when nobody follows it.
 */
export async function fetchWalkContactNames(walkId: string): Promise<string[]> {
  const { data, error } = await client()
    .from('walk_contacts')
    .select('contacts(label)')
    .eq('walk_id', walkId)
  if (error) throw error
  // The app has no generated database types, so this says what one row looks like: the linked
  // contact, or null if it was removed in the meantime.
  return (data as unknown as { contacts: { label: string } | null }[])
    .map((link) => link.contacts?.label)
    .filter((label): label is string => Boolean(label))
}

/** A contact who follows a walk, as the walker sees them: their id, name and status. */
export type WalkContact = {
  id: string
  label: string
  status: 'invited' | 'accepted' | 'paused'
}

/**
 * The contacts who follow this walk, for the "You're home" screen (SCRUM-106). The screen needs
 * their status too: a contact who was paused got no message.
 */
export async function fetchWalkContacts(walkId: string): Promise<WalkContact[]> {
  const { data, error } = await client()
    .from('walk_contacts')
    .select('contacts(id, label, status)')
    .eq('walk_id', walkId)
  if (error) throw error
  // As in fetchWalkContactNames: the linked contact, or null if it was removed in the meantime.
  return (data as unknown as { contacts: WalkContact | null }[])
    .map((link) => link.contacts)
    .filter((contact): contact is WalkContact => contact !== null)
}
