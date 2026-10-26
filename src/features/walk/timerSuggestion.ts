/**
 * The timer on the start-walk screen: where the slider starts, and how far it goes. Minutes, in
 * steps of one (decided on 26 Oct: steps of 5 felt too rough).
 *
 * With a route planned on Home the slider adapts to that route, so the user does not have to guess
 * and a slower walk or a red light does not set off "Are you OK?" (Studio Krom: false alarms
 * should not be the first thing that comes to mind):
 * - it starts at the walking time plus 5 minutes;
 * - it cannot go below the walking time, which would set off "Are you OK?" on the way for sure;
 * - it goes up to three times the walking time, at least an hour.
 *
 * Assumptions: the 5 extra minutes, three times the walking time, and 2 hours without a route. The
 * server accepts 1 to 180 minutes.
 */
export const EXTRA_MINUTES = 5

// Without a route the app cannot estimate anything; the design shows 20 minutes.
export const DEFAULT_MINUTES = 20

const SERVER_MAX = 180

export type TimerRange = { min: number; max: number }

/** The walking time of the route in whole minutes, or null without a route. */
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

/**
 * The four quick choices under the slider. Without a route the design's 10, 15, 20 and 30 minutes;
 * with a route the walking time plus 5, 10, 15 and 20 minutes, so they fit that walk.
 */
export function timerPresets(routeSeconds: number | null): number[] {
  const walking = walkingMinutes(routeSeconds)
  if (walking === null) return [10, 15, 20, 30]
  // A very long route reaches the server's 3 hours; the same choice is shown once.
  return [...new Set([5, 10, 15, 20].map((extra) => Math.min(SERVER_MAX, walking + extra)))]
}
