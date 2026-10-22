import { supabase } from '../../lib/supabase.ts'

/** The four categories from SCRUM-8: no light, quiet or empty, an unsafe feeling, and other. */
export type ReportCategory = 'no_light' | 'quiet' | 'unsafe' | 'other'

export type NewPlaceReport = {
  category: ReportCategory
  /** Where the user is now. Rounded before it leaves the phone; see roundForReport. */
  latitude: number
  longitude: number
  /** Optional, at most 140 characters. Not shown to other users yet (SCRUM-32). */
  note?: string
}

// Assumption: 3 decimals, about 110 m north-south and 70 m east-west in Eindhoven. SCRUM-90 decides
// for real. Keep it the same as in supabase/migrations/0008_reports.sql.
const DECIMALS = 3

function client() {
  if (!supabase) throw new Error('The backend is not set up. See docs/backend.md.')
  return supabase
}

/**
 * Makes a coordinate less exact, so a report shows the area and not the reporter's front door. The
 * server rounds again, so this is a second lock: the exact spot never leaves the phone.
 */
export function roundForReport(coordinate: number): number {
  const factor = 10 ** DECIMALS
  return Math.round(coordinate * factor) / factor
}

/**
 * Saves a report about the place where the user is now. Other users see the category, the rounded
 * spot and the time, never who made it. Fails after 20 reports in a day.
 */
export async function reportPlace(report: NewPlaceReport): Promise<void> {
  const { error } = await client().rpc('report_place', {
    category: report.category,
    lat: roundForReport(report.latitude),
    lng: roundForReport(report.longitude),
    note: report.note?.trim() || null,
  })
  if (error) throw error
}
