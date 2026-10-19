import { useRef, useState } from 'react'
import { isReportedBroken, type BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import { findLampNear, type Lamp } from './lamps.ts'

/** What the report menu shows after a long press. */
export type ReportMenu =
  | { state: 'looking' }
  | { state: 'found'; lamp: Lamp }
  | { state: 'none' }
  | { state: 'already'; lamp: Lamp }
  | { state: 'failed' }

/**
 * The report menu that opens after pressing and holding the map. The nearest street light is
 * looked up straight away, so the user only has to tap once to report it.
 */
export function useLampReport(brokenLights: BrokenLight[]) {
  const [menu, setMenu] = useState<ReportMenu | null>(null)
  // Counts the lookups, so the answer to an older press never fills in a newer menu.
  const lookupCount = useRef(0)

  async function open(point: LngLat) {
    const lookup = ++lookupCount.current
    setMenu({ state: 'looking' })
    try {
      const lamp = await findLampNear(point)
      if (lookup !== lookupCount.current) return
      if (!lamp) setMenu({ state: 'none' })
      else if (isReportedBroken(lamp, brokenLights)) setMenu({ state: 'already', lamp })
      else setMenu({ state: 'found', lamp })
    } catch {
      if (lookup === lookupCount.current) setMenu({ state: 'failed' })
    }
  }

  function close() {
    lookupCount.current++
    setMenu(null)
  }

  return { menu, open, close }
}
