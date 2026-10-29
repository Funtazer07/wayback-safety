import { supabase } from '../../lib/supabase.ts'
import type { LngLat } from '../map/geometry.ts'

/** The server shares the route only while on the way, and the location only while overdue. */
export type FollowedWalk = {
  walkerName: string
  status: 'active' | 'safe' | 'overdue' | 'cancelled'
  deadline: Date
  overdueAt: Date | null
  checkedInAt: Date | null
  cancelledAt: Date | null
  lastLocation: { coordinates: LngLat; savedAt: Date } | null
  youAreWatching: boolean
  route: LngLat[] | null
}

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
  you_are_watching: boolean
  route: LngLat[] | null
}

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
    youAreWatching: row.you_are_watching,
    route: row.route,
  }
}

export async function watchWalk(walkId: string): Promise<void> {
  const { error } = await client().rpc('watch_walk', { walk_id: walkId })
  if (error) throw error
}

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

export type ContactWalk = {
  walkId: string
  walkerName: string
  /** Null when the user removed the walker from their list. */
  contactId: string | null
  status: FollowedWalk['status']
  startedAt: Date
  deadline: Date
  overdueAt: Date | null
  checkedInAt: Date | null
  cancelledAt: Date | null
}

type ContactWalkRow = {
  walk_id: string
  walker_name: string | null
  contact_id: string | null
  status: FollowedWalk['status']
  started_at: string
  deadline: string
  overdue_at: string | null
  checked_in_at: string | null
  cancelled_at: string | null
}

/** One walk per person: on the way, overdue, or ended in the last 12 hours. */
export async function fetchContactWalks(): Promise<ContactWalk[]> {
  const { data, error } = await client().rpc('followed_walk_statuses')
  if (error) throw error
  return (data as ContactWalkRow[]).map((row) => ({
    walkId: row.walk_id,
    walkerName: row.walker_name?.trim() || 'Your contact',
    contactId: row.contact_id,
    status: row.status,
    startedAt: new Date(row.started_at),
    deadline: new Date(row.deadline),
    overdueAt: toDate(row.overdue_at),
    checkedInAt: toDate(row.checked_in_at),
    cancelledAt: toDate(row.cancelled_at),
  }))
}

// Google sign-in drops ?walk=<id> from the address, so it is kept here until it is used.
const storageKey = 'wayback.openWalk'
const walkIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Removes ?walk= from the address bar, so a reload does not open it again. */
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
  return walkId && walkIdPattern.test(walkId) ? walkId : null
}

export function forgetOpenedWalk(): void {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Nothing was stored.
  }
}
