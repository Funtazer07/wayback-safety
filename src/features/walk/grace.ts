import { addMinutes } from './time.ts'
import type { Walk } from './walk.ts'

/**
 * Assumption: 5 minutes between "Are you OK?" and alerting the contacts, from the 05:00 on screen 06
 * of the SCRUM-72 prototype, until SCRUM-71 (research) decides. The server decides for real; keep it
 * the same as grace_period in supabase/migrations/0011_late_walks.sql.
 */
export const GRACE_MINUTES = 5

/**
 * Which screen a running walk needs.
 * - walking: before the deadline. The map with the timer.
 * - grace:   the deadline passed, nobody has been told yet. The "Are you OK?" screen.
 * - overdue: the server marked the walk overdue and the contacts are told (SCRUM-74).
 * - ended:   checked in or cancelled.
 */
export type WalkPhase = 'walking' | 'grace' | 'overdue' | 'ended'

export function walkPhase(walk: Walk, now: Date): WalkPhase {
  if (walk.status === 'safe' || walk.status === 'cancelled') return 'ended'
  if (walk.status === 'overdue') return 'overdue'
  return walk.deadline.getTime() <= now.getTime() ? 'grace' : 'walking'
}

/**
 * When the server will alert the contacts. It counts the grace period from the moment it sent "Are
 * you OK?" (warned_at), which is up to a minute after the deadline. Until the screen knows that
 * moment, it counts from the deadline: that shows a little less time than there really is, never
 * more. A warning from before an extension does not count.
 */
export function graceEndsAt(walk: Walk): Date {
  const warnedAt = walk.warnedAt
  const start = warnedAt && warnedAt.getTime() >= walk.deadline.getTime() ? warnedAt : walk.deadline
  return addMinutes(start, GRACE_MINUTES)
}

/** Names as in a sentence: "Mum", "Mum and Alex", "Mum, Alex and Sam". */
export function namesInWords(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
