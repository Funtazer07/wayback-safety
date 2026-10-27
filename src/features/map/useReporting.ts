import { useEffect, useState } from 'react'
import type { BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import type { Lamp } from './lamps.ts'
import { useBrokenLights } from './useBrokenLights.ts'
import { useLampReport } from './useLampReport.ts'

const failed = 'Could not save this. Check your connection and try again.'

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
    async reportBroken(lamp: Lamp) {
      report.close()
      try {
        afterChange(await add(lamp), 'Thank you. The light is marked as broken.')
      } catch {
        afterChange(brokenLights, failed)
      }
    },
    async worksAgain(lampId: string) {
      setOpenLightId(null)
      try {
        afterChange(await remove(lampId), 'Thank you. The light counts as working again.')
      } catch {
        afterChange(brokenLights, failed)
      }
    },
  }
}
