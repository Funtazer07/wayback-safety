import { useEffect, useRef, useState } from 'react'
import { brokenPlaces, type BrokenLight } from './brokenLights.ts'
import { isInEindhoven, isSameWay, type LngLat } from './geometry.ts'
import { measureRouteLamps, type MeasuredRoute } from './lamps.ts'
import { mostLightsFirst } from './routeChoice.ts'
import { fetchRoutes } from './routes.ts'
import type { UserPosition } from './useUserPosition.ts'

type PlanOptions = {
  keepChoice?: boolean
  thankYou?: string
}

export function usePlanner(position: UserPosition | null) {
  const [chosenStart, setChosenStart] = useState<LngLat | null>(null)
  const [destination, setDestination] = useState<LngLat | null>(null)
  const [routes, setRoutes] = useState<MeasuredRoute[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isChoosing, setIsChoosing] = useState(false)
  const [status, setStatus] = useState('')
  // Planning again after a report does not change this, so the map does not move.
  const [newRoutes, setNewRoutes] = useState<MeasuredRoute[] | null>(null)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

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

  function tapPlace(point: LngLat, lights: BrokenLight[]) {
    if (!start) {
      setChosenStart(point)
      return
    }
    setDestination(point)
    plan(start, point, lights)
  }

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
