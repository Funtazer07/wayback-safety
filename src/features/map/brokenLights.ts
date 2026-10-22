import { supabase } from '../../lib/supabase.ts'
import { placeOf, type LngLat } from './geometry.ts'
import type { Lamp } from './lamps.ts'

/** A street light a user reported as broken. Every signed-in user sees it; not who reported it. */
export type BrokenLight = {
  lampId: string
  coordinates: LngLat
  street: string
  /** ISO date and time. */
  reportedAt: string
}

// A broken-light row of the reports table, as the database returns it. See
// supabase/migrations/0008_reports.sql. Only the columns the app is allowed to read.
type BrokenLightRow = {
  lamp_id: string
  lat: number
  lng: number
  street: string | null
  created_at: string
}

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

function toBrokenLight(row: BrokenLightRow): BrokenLight {
  return {
    lampId: row.lamp_id,
    coordinates: [row.lng, row.lat],
    street: row.street ?? '',
    reportedAt: new Date(row.created_at).toISOString(),
  }
}

/** All lights reported as broken by anyone, that have not expired. */
export async function fetchBrokenLights(): Promise<BrokenLight[]> {
  // Row level security only returns reports that have not expired.
  const { data, error } = await client()
    .from('reports')
    .select('lamp_id, lat, lng, street, created_at')
    .not('lamp_id', 'is', null)
  if (error) throw error
  return data.map(toBrokenLight)
}

/** Reports this lamp as broken. Fails when someone already reported it. */
export async function reportBrokenLight(lamp: Lamp): Promise<BrokenLight> {
  const { data, error } = await client()
    .rpc('report_broken_light', {
      lamp_id: lamp.lampId,
      // The lamp's own spot from the register, not where the user is.
      lat: lamp.coordinates[1],
      lng: lamp.coordinates[0],
      street: lamp.street,
    })
    .single<{ created_at: string }>()
  if (error) throw error
  return {
    lampId: lamp.lampId,
    coordinates: lamp.coordinates,
    street: lamp.street,
    reportedAt: new Date(data.created_at).toISOString(),
  }
}

/** "It works again": removes the report of this lamp, for everyone. */
export async function markLightWorking(lampId: string): Promise<void> {
  const { error } = await client().rpc('mark_light_working', { lamp_id: lampId })
  if (error) throw error
}

export function brokenPlaces(lights: BrokenLight[]): Set<string> {
  return new Set(lights.map((light) => placeOf(light.coordinates)))
}

export function isReportedBroken(lamp: Lamp, lights: BrokenLight[]): boolean {
  return brokenPlaces(lights).has(placeOf(lamp.coordinates))
}
