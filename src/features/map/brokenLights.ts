import { supabase } from '../../lib/supabase.ts'
import { placeOf, type LngLat } from './geometry.ts'
import type { Lamp } from './lamps.ts'

export type BrokenLight = {
  lampId: string
  coordinates: LngLat
  street: string
  reportedAt: string
}

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

export async function fetchBrokenLights(): Promise<BrokenLight[]> {
  // RLS leaves out expired reports.
  const { data, error } = await client()
    .from('reports')
    .select('lamp_id, lat, lng, street, created_at')
    .not('lamp_id', 'is', null)
  if (error) throw error
  return data.map(toBrokenLight)
}

export async function reportBrokenLight(lamp: Lamp): Promise<BrokenLight> {
  const { data, error } = await client()
    .rpc('report_broken_light', {
      lamp_id: lamp.lampId,
      // The lamp's spot, not the user's.
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
