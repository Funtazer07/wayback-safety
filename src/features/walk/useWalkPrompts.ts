import { useState } from 'react'
import type { LngLat } from '../map/geometry.ts'
import { hasArrived, suggestedExtension, type Fix } from './progress.ts'
import type { Walk } from './walk.ts'

type WalkPromptsInput = {
  walk: Walk
  route: LngLat[] | null
  routeSeconds: number | null
  fixes: Fix[]
  now: Date
}

/**
 * Which question the walk screen asks now, if any (SCRUM-97 ideation): "Are you home?" at the end
 * of the route (SCRUM-112), otherwise "Running late?" when the walker will be late (SCRUM-113).
 * Each is asked once: "Not yet" is not asked again for this walk, and "Keep my time" not again for
 * this check-in time. A new check-in time can bring a new suggestion.
 */
export function useWalkPrompts({ walk, route, routeSeconds, fixes, now }: WalkPromptsInput) {
  const [isArrivalDismissed, setIsArrivalDismissed] = useState(false)
  const [lateDismissedFor, setLateDismissedFor] = useState<number | null>(null)
  const deadline = walk.deadline.getTime()

  const isArrived = !isArrivalDismissed && hasArrived(route, fixes, now)
  const suggestion =
    isArrived || lateDismissedFor === deadline
      ? null
      : suggestedExtension({ route, routeSeconds, fixes, deadline: walk.deadline, now })

  return {
    isArrived,
    suggestion,
    dismissArrival: () => setIsArrivalDismissed(true),
    dismissLate: () => setLateDismissedFor(deadline),
  }
}
