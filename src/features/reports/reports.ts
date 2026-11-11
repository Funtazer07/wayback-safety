import { supabase } from '../../lib/supabase.ts'
import type { LngLat } from '../map/geometry.ts'

/** Categories supported by the report form and the report migrations. */
export type ReportCategory = 'broken_light' | 'dark_area' | 'quiet' | 'unsafe' | 'other'

/** A place report as every user sees it on the map: never who made it, never the note. */
export type PlaceReport = {
  id: string
  category: ReportCategory
  /** The rounded spot, about 100 m from where the reporter really was. */
  coordinates: LngLat
  reportedAt: Date
}

type PlaceReportRow = {
  id: string
  category: ReportCategory
  lat: number
  lng: number
  created_at: string
}

export type NewPlaceReport = {
  category: ReportCategory
  /** Rounded before it leaves the phone; see roundForReport. */
  latitude: number
  longitude: number
  /** At most NOTE_MAX_LENGTH characters. */
  note?: string
}

// Assumption: about 110 by 70 m in Eindhoven. Must match 0008_reports.sql.
const DECIMALS = 3

/** Must match the check on reports.note in 0008_reports.sql. */
export const NOTE_MAX_LENGTH = 140

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

/** Shows the area, not the reporter's front door. The server rounds again. */
export function roundForReport(coordinate: number): number {
  const factor = 10 ** DECIMALS
  return Math.round(coordinate * factor) / factor
}

function toPlaceReport(row: PlaceReportRow): PlaceReport {
  return {
    id: row.id,
    category: row.category,
    coordinates: [row.lng, row.lat],
    reportedAt: new Date(row.created_at),
  }
}

/** The place reports of the last 30 days. Broken lights from the map are fetched separately. */
export async function fetchPlaceReports(): Promise<PlaceReport[]> {
  // RLS leaves out expired reports, and the column rights leave out who reported and the note.
  const { data, error } = await client()
    .from('reports')
    .select('id, category, lat, lng, created_at')
    .is('lamp_id', null)
  if (error) throw error
  return (data as PlaceReportRow[]).map(toPlaceReport)
}

/** Others never see who made it. Fails after 20 reports in a day. */
export async function reportPlace(report: NewPlaceReport): Promise<void> {
  const { error } = await client().rpc('report_place', {
    category: report.category,
    lat: roundForReport(report.latitude),
    lng: roundForReport(report.longitude),
    note: report.note?.trim() || null,
  })
  if (error) throw error
}

/** Older servers do not have the quiet category yet. */
export async function quietReportingAvailable(): Promise<boolean> {
  const { data, error } = await client().rpc('quiet_reporting_available')
  return !error && data === true
}
