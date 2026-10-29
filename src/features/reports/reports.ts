import { supabase } from '../../lib/supabase.ts'

export type ReportCategory = 'no_light' | 'quiet' | 'unsafe' | 'other'

export type NewPlaceReport = {
  category: ReportCategory
  /** Rounded before it leaves the phone; see roundForReport. */
  latitude: number
  longitude: number
  /** At most 140 characters. */
  note?: string
}

// Assumption: about 110 by 70 m in Eindhoven. Must match 0008_reports.sql.
const DECIMALS = 3

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

/** Shows the area, not the reporter's front door. The server rounds again. */
export function roundForReport(coordinate: number): number {
  const factor = 10 ** DECIMALS
  return Math.round(coordinate * factor) / factor
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
