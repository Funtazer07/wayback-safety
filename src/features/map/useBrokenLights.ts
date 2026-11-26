import { useCallback, useEffect, useState } from 'react'
import {
  fetchBrokenLights,
  markLightWorking,
  reportBrokenLight,
  type BrokenLight,
} from './brokenLights.ts'
import type { Lamp } from './lamps.ts'

export function useBrokenLights() {
  const [brokenLights, setBrokenLights] = useState<BrokenLight[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let isCurrent = true
    fetchBrokenLights()
      .then((lights) => isCurrent && setBrokenLights(lights))
      // The map works without the reports, so a failed load is not an error.
      .catch(() => {})
    return () => {
      isCurrent = false
    }
  }, [version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])

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

  return { brokenLights, reload, add, remove }
}
