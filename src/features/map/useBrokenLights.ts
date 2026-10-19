import { useState } from 'react'
import {
  brokenLightFrom,
  loadBrokenLights,
  saveBrokenLights,
  type BrokenLight,
} from './brokenLights.ts'
import type { Lamp } from './lamps.ts'

/** The street lights reported as broken. Adding or removing one returns the new list. */
export function useBrokenLights() {
  const [brokenLights, setBrokenLights] = useState<BrokenLight[]>(loadBrokenLights)

  function update(next: BrokenLight[]): BrokenLight[] {
    setBrokenLights(next)
    saveBrokenLights(next)
    return next
  }

  function add(lamp: Lamp): BrokenLight[] {
    return update([...brokenLights, brokenLightFrom(lamp, new Date())])
  }

  function remove(lampId: string): BrokenLight[] {
    return update(brokenLights.filter((light) => light.lampId !== lampId))
  }

  return { brokenLights, add, remove }
}
