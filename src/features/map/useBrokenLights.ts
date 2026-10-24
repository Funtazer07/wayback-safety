import { useEffect, useState } from 'react'
import {
  fetchBrokenLights,
  markLightWorking,
  reportBrokenLight,
  type BrokenLight,
} from './brokenLights.ts'
import type { Lamp } from './lamps.ts'

/**
 * The street lights reported as broken, by anyone. Adding or removing one saves it on the server
 * and returns the new list; it throws when the server refuses.
 */
export function useBrokenLights() {
  const [brokenLights, setBrokenLights] = useState<BrokenLight[]>([])

  useEffect(() => {
    let isCurrent = true
    fetchBrokenLights()
      .then((lights) => isCurrent && setBrokenLights(lights))
      // The map and the routes still work without the reports, so a failed load is not shown as an
      // error. The routes then count every light as working.
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [])

  async function add(lamp: Lamp): Promise<BrokenLight[]> {
    const light = await reportBrokenLight(lamp)
    const next = [...brokenLights.filter((other) => other.lampId !== light.lampId), light]
    setBrokenLights(next)
    return next
  }

  async function remove(lampId: string): Promise<BrokenLight[]> {
    await markLightWorking(lampId)
    const next = brokenLights.filter((light) => light.lampId !== lampId)
    setBrokenLights(next)
    return next
  }

  return { brokenLights, add, remove }
}
