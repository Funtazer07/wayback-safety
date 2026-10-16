import { useEffect, useState } from 'react'
import type { BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import type { Lamp } from './lamps.ts'
import { useBrokenLights } from './useBrokenLights.ts'
import { useLampReport } from './useLampReport.ts'

/**
 * Reporting broken street lights on a map: the menu after a long press, and the sheet of a light
 * that is already reported. `afterChange` hears about every change, with a thank-you for the user.
 */
export function useReporting(afterChange: (lights: BrokenLight[], thankYou: string) => void) {
  const { brokenLights, add, remove } = useBrokenLights()
  const report = useLampReport(brokenLights)
  const [openLightId, setOpenLightId] = useState<string | null>(null)
  const openLight = brokenLights.find((light) => light.lampId === openLightId) ?? null

  function closeAll() {
    report.close()
    setOpenLightId(null)
  }

  const isSheetOpen = report.menu !== null || openLight !== null
  // On a laptop, Escape closes the sheet as well.
  useEffect(() => {
    if (!isSheetOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        report.close()
        setOpenLightId(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return {
    brokenLights,
    menu: report.menu,
    openLight,
    /** True while a sheet covers the bottom of the map. */
    isSheetOpen,
    closeAll,
    startReport(point: LngLat) {
      setOpenLightId(null)
      report.open(point)
    },
    showLight(lampId: string) {
      report.close()
      setOpenLightId(lampId)
    },
    reportBroken(lamp: Lamp) {
      report.close()
      afterChange(add(lamp), 'Thank you. The light is marked as broken.')
    },
    worksAgain(lampId: string) {
      setOpenLightId(null)
      afterChange(remove(lampId), 'Thank you. The light counts as working again.')
    },
  }
}
