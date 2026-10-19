import { useEffect, useRef, useState } from 'react'
import { brokenPlaces, type BrokenLight } from './brokenLights.ts'
import { isInEindhoven, isSameWay, type LngLat } from './geometry.ts'
import { measureRouteLamps, type MeasuredRoute } from './lamps.ts'
import { mostLightsFirst } from './routeChoice.ts'
import { fetchRoutes } from './routes.ts'
import type { UserPosition } from './useUserPosition.ts'

type PlanOptions = {
  /** Planning again after a report: keep the route the user chose, and the list as it was. */
  keepChoice?: boolean
  /** Shown when the counting is done, so the "Counting…" message does not wipe it away. */
  thankYou?: string
}

/** Planning a walk on the map: the start, the destination and the routes to choose from. */
export function usePlanner(position: UserPosition | null) {
  const [chosenStart, setChosenStart] = useState<LngLat | null>(null)
  const [destination, setDestination] = useState<LngLat | null>(null)
  const [routes, setRoutes] = useState<MeasuredRoute[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  // True while the list of routes is open. Choosing a route closes it, to give the map more room.
  const [isChoosing, setIsChoosing] = useState(false)
  const [status, setStatus] = useState('')
  // The routes of the latest new plan, so the map can zoom out to show them. Planning again after
  // a report does not change it, so the map stays where the user was looking.
  const [newRoutes, setNewRoutes] = useState<MeasuredRoute[] | null>(null)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

  // A tapped start wins; otherwise the user's own position, when it is inside the map.
  const start =
    chosenStart ?? (position && isInEindhoven(position.coordinates) ? position.coordinates : null)

  async function plan(from: LngLat, to: LngLat, lights: BrokenLight[], options: PlanOptions = {}) {
    const { keepChoice = false, thankYou = '' } = options
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    const chosenRoute = keepChoice ? routes[selectedIndex] : undefined

    if (!keepChoice) {
      setRoutes([])
      setIsChoosing(false)
    }
    setStatus('Finding walking routes…')

    try {
      const found = await fetchRoutes(from, to, controller.signal)
      if (found.length === 0) {
        setStatus('Could not find a walking route to this place. Try a spot on a street.')
        return
      }
      setStatus('Counting the street lights along each route…')
      const places = brokenPlaces(lights)
      const measured = mostLightsFirst(
        await Promise.all(
          found.map((route) => measureRouteLamps(route, places, controller.signal)),
        ),
      )
      if (controller.signal.aborted) return

      setRoutes(measured)
      setSelectedIndex(
        chosenRoute
          ? Math.max(
              0,
              measured.findIndex((route) => isSameWay(chosenRoute.coordinates, route.coordinates)),
            )
          : 0,
      )
      if (!keepChoice) {
        setIsChoosing(true)
        setNewRoutes(measured)
      }
      setStatus(thankYou)
    } catch {
      if (controller.signal.aborted) return
      setStatus('Could not plan a route. Check your connection and try again.')
    }
  }

  /** A tap on the map: first it sets the start (when there is no position), then the destination. */
  function tapPlace(point: LngLat, lights: BrokenLight[]) {
    if (!start) {
      setChosenStart(point)
      return
    }
    setDestination(point)
    plan(start, point, lights)
  }

  /** The counts change when a light breaks or works again, so the walk is planned again. */
  function replan(lights: BrokenLight[], thankYou: string) {
    if (start && destination) plan(start, destination, lights, { keepChoice: true, thankYou })
    else setStatus(thankYou)
  }

  function selectRoute(index: number) {
    setSelectedIndex(index)
    setIsChoosing(false)
  }

  function reset() {
    request.current?.abort()
    setChosenStart(null)
    setDestination(null)
    setRoutes([])
    setIsChoosing(false)
    setStatus('')
  }

  return {
    chosenStart,
    start,
    destination,
    routes,
    selectedIndex,
    isChoosing,
    status,
    newRoutes,
    tapPlace,
    replan,
    selectRoute,
    showAllRoutes: () => setIsChoosing(true),
    reset,
  }
}
