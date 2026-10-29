// With a route, the timer starts a little above the walking time and never goes below it, to avoid
// false alarms. Assumption: 5 extra minutes, up to three times the walking time.
export const EXTRA_MINUTES = 5

export const DEFAULT_MINUTES = 20

const SERVER_MAX = 180

export type TimerRange = { min: number; max: number }

function walkingMinutes(routeSeconds: number | null): number | null {
  return routeSeconds === null ? null : Math.max(1, Math.ceil(routeSeconds / 60))
}

export function timerRange(routeSeconds: number | null): TimerRange {
  const walking = walkingMinutes(routeSeconds)
  if (walking === null) return { min: 5, max: 120 }
  const min = Math.min(walking, SERVER_MAX)
  return { min, max: Math.min(SERVER_MAX, Math.max(60, walking * 3, min + EXTRA_MINUTES)) }
}

export function suggestedMinutes(routeSeconds: number | null): number {
  const walking = walkingMinutes(routeSeconds)
  if (walking === null) return DEFAULT_MINUTES
  return Math.min(SERVER_MAX, walking + EXTRA_MINUTES)
}

export function timerPresets(routeSeconds: number | null): number[] {
  const walking = walkingMinutes(routeSeconds)
  if (walking === null) return [10, 15, 20, 30]
  return [...new Set([5, 10, 15, 20].map((extra) => Math.min(SERVER_MAX, walking + extra)))]
}
