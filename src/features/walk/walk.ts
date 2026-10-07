import { supabase } from '../../lib/supabase.ts'

export type Walk = {
  id: string
  /** What the user picked as destination, for example "Home". */
  destinationLabel: string
  startedAt: Date
  /** When the user should be home. Set by the server, so it is the same on every device. */
  deadline: Date
  status: 'active' | 'safe' | 'overdue'
}

export type NewWalk = {
  destinationLabel: string
  /** Where the destination is. Left out while the user can only pick or type a name. */
  latitude?: number
  longitude?: number
  /** How long the walk may take. The server adds this to its own clock to get the deadline. */
  minutes: number
}

// A row of the walks table, as the database returns it. See supabase/migrations/0003_walks.sql
// and 0004_check_in.sql. Only the columns the app uses are listed.
type WalkRow = {
  id: string
  destination_label: string
  started_at: string
  deadline: string
  status: Walk['status']
}

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
  }
}

/** Starts a walk for the logged-in user. Fails when they already have an active walk. */
export async function startWalk(newWalk: NewWalk): Promise<Walk> {
  const { data, error } = await client().rpc('start_walk', {
    label: newWalk.destinationLabel,
    minutes: newWalk.minutes,
    lat: newWalk.latitude,
    lng: newWalk.longitude,
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

/** The walk the logged-in user is on, or null. Use it to pick the timer up after reopening the app. */
export async function fetchActiveWalk(): Promise<Walk | null> {
  // No user filter needed: row level security only returns the user's own walks, and the database
  // allows one active walk per user.
  const { data, error } = await client()
    .from('walks')
    .select('id, destination_label, started_at, deadline, status')
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return data ? toWalk(data) : null
}
