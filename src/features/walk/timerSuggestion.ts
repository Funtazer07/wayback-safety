// With a route, the timer starts at the walking time and never goes below it. The quick choices add
// time for a slower walk. Assumption: up to three times the walking time.
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
  return { min, max: Math.min(SERVER_MAX, Math.max(60, walking * 3, min + 5)) }
}

export function suggestedMinutes(routeSeconds: number | null): number {
  const walking = walkingMinutes(routeSeconds)
  if (walking === null) return DEFAULT_MINUTES
  return Math.min(SERVER_MAX, walking)
}

export function timerPresets(routeSeconds: number | null): number[] {
  const walking = walkingMinutes(routeSeconds)
  if (walking === null) return [10, 15, 20, 30]
  return [...new Set([0, 5, 10, 15].map((extra) => Math.min(SERVER_MAX, walking + extra)))]
}
