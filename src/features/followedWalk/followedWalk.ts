import { supabase } from '../../lib/supabase.ts'
import type { LngLat } from '../map/geometry.ts'

/**
 * A walk seen by one of its contacts (SCRUM-102). Only what the server shares with a contact:
 * no destination, no route, and the location only while the walk is overdue.
 */
export type FollowedWalk = {
  walkerName: string
  status: 'active' | 'safe' | 'overdue' | 'cancelled'
  deadline: Date
  overdueAt: Date | null
  checkedInAt: Date | null
  cancelledAt: Date | null
  /** Where the walker was last seen and when. Null when not overdue, or nothing was shared. */
  lastLocation: { coordinates: LngLat; savedAt: Date } | null
}

// One row from followed_walk() in supabase/migrations/0013_contact_walk_view.sql.
type FollowedWalkRow = {
  walker_name: string | null
  status: FollowedWalk['status']
  deadline: string
  overdue_at: string | null
  checked_in_at: string | null
  cancelled_at: string | null
  last_lat: number | null
  last_lng: number | null
  last_location_at: string | null
}

/** The server's answer when the walk does not exist or this user is not one of its contacts. */
export class NotSharedError extends Error {
  constructor() {
    super('This walk is not shared with you')
    this.name = 'NotSharedError'
  }
}

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

const toDate = (value: string | null) => (value ? new Date(value) : null)

function toFollowedWalk(row: FollowedWalkRow): FollowedWalk {
  return {
    walkerName: row.walker_name?.trim() || 'Your contact',
    status: row.status,
    deadline: new Date(row.deadline),
    overdueAt: toDate(row.overdue_at),
    checkedInAt: toDate(row.checked_in_at),
    cancelledAt: toDate(row.cancelled_at),
    lastLocation:
      row.last_lat !== null && row.last_lng !== null && row.last_location_at
        ? { coordinates: [row.last_lng, row.last_lat], savedAt: new Date(row.last_location_at) }
        : null,
  }
}

/** The walk with this id, as its contact may see it. Fails with NotSharedError when not allowed. */
export async function fetchFollowedWalk(walkId: string): Promise<FollowedWalk> {
  const { data, error } = await client()
    .rpc('followed_walk', { walk_id: walkId })
    .single<FollowedWalkRow>()
  if (error) {
    if (error.message.includes('not shared with you')) throw new NotSharedError()
    throw error
  }
  return toFollowedWalk(data)
}

/**
 * The latest walk of someone the user looks out for, as shown on the Contacts tab (SCRUM-115).
 * Only the status and its times: no location, no destination.
 */
export type ContactWalk = {
  walkId: string
  walkerName: string
  /** The user's own contacts row for the walker. Null when the user removed them from the list. */
  contactId: string | null
  status: FollowedWalk['status']
  deadline: Date
  overdueAt: Date | null
  checkedInAt: Date | null
  cancelledAt: Date | null
}

// One row from followed_walk_statuses() in supabase/migrations/0016_contact_alerts_and_walk_status.sql.
type ContactWalkRow = {
  walk_id: string
  walker_name: string | null
  contact_id: string | null
  status: FollowedWalk['status']
  deadline: string
  overdue_at: string | null
  checked_in_at: string | null
  cancelled_at: string | null
}

/**
 * One walk per person the user looks out for: on the way, overdue, or ended in the last 12 hours.
 * The server only returns walks the user may open.
 */
export async function fetchContactWalks(): Promise<ContactWalk[]> {
  const { data, error } = await client().rpc('followed_walk_statuses')
  if (error) throw error
  return (data as ContactWalkRow[]).map((row) => ({
    walkId: row.walk_id,
    walkerName: row.walker_name?.trim() || 'Your contact',
    contactId: row.contact_id,
    status: row.status,
    deadline: new Date(row.deadline),
    overdueAt: toDate(row.overdue_at),
    checkedInAt: toDate(row.checked_in_at),
    cancelledAt: toDate(row.cancelled_at),
  }))
}

// The alert links to the app with ?walk=<id> (SCRUM-74). Signing in first (Google sends the user
// away and back) loses that part of the address, so it is kept here for this tab until it is used.
const storageKey = 'wayback.openWalk'
const walkIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The walk the app was opened for, from ?walk=<id> or from before signing in. Removes ?walk= from
 * the address bar, so a reload does not open it again by surprise. Null when there is none.
 */
export function takeOpenedWalkId(): string | null {
  const url = new URL(window.location.href)
  const fromUrl = url.searchParams.get('walk')
  if (fromUrl) {
    url.searchParams.delete('walk')
    window.history.replaceState(null, '', url)
    try {
      sessionStorage.setItem(storageKey, fromUrl)
    } catch {
      // Storage blocked: the walk opens now, but not after signing in.
    }
  }
  let walkId = fromUrl
  try {
    walkId ??= sessionStorage.getItem(storageKey)
  } catch {
    // Storage blocked: only the address bar counts.
  }
  // Anything else in the address is ignored instead of being sent to the server.
  return walkId && walkIdPattern.test(walkId) ? walkId : null
}

/** The contact closed the walk: do not open it again. */
export function forgetOpenedWalk(): void {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Nothing was stored.
  }
}
