import { addMinutes } from './time.ts'
import type { Walk } from './walk.ts'

/** The server decides; must match grace_period in 0017_three_minute_grace.sql. */
export const GRACE_MINUTES = 3

export const EXTEND_MINUTES = 5

/** grace: the deadline passed, but the contacts have not been told yet. */
export type WalkPhase = 'walking' | 'grace' | 'overdue' | 'ended'

export function walkPhase(walk: Walk, now: Date): WalkPhase {
  if (walk.status === 'safe' || walk.status === 'cancelled') return 'ended'
  if (walk.status === 'overdue') return 'overdue'
  return walk.deadline.getTime() <= now.getTime() ? 'grace' : 'walking'
}

/**
 * Until warnedAt is known it counts from the deadline, which shows a little less time than there
 * is, never more. A warning from before an extension does not count.
 */
export function graceEndsAt(walk: Walk): Date {
  const warnedAt = walk.warnedAt
  const start = warnedAt && warnedAt.getTime() >= walk.deadline.getTime() ? warnedAt : walk.deadline
  return addMinutes(start, GRACE_MINUTES)
}

/** "Mum", "Mum and Alex", "Mum, Alex and Sam". */
export function namesInWords(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
