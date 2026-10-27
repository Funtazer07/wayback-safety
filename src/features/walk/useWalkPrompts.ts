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

/** Each question is asked once per walk; "Running late?" may come back after a new deadline. */
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
