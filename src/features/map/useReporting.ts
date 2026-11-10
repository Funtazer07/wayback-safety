import { useEffect, useState } from 'react'
import { usePlaceReports } from '../reports/usePlaceReports.ts'
import type { BrokenLight } from './brokenLights.ts'
import type { LngLat } from './geometry.ts'
import type { Lamp } from './lamps.ts'
import { useBrokenLights } from './useBrokenLights.ts'
import { useLampReport } from './useLampReport.ts'

const failed = 'Could not save this. Check your connection and try again.'

export function useReporting(afterChange: (lights: BrokenLight[], thankYou: string) => void) {
  const { brokenLights, add, remove } = useBrokenLights()
  const { placeReports, reload: reloadPlaceReports } = usePlaceReports()
  const report = useLampReport(brokenLights)
  const [openLightId, setOpenLightId] = useState<string | null>(null)
  const openLight = brokenLights.find((light) => light.lampId === openLightId) ?? null
  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const openReport = placeReports.find((placeReport) => placeReport.id === openReportId) ?? null

  function closeAll() {
    report.close()
    setOpenLightId(null)
    setOpenReportId(null)
  }

  const isSheetOpen = report.menu !== null || openLight !== null || openReport !== null
  useEffect(() => {
    if (!isSheetOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        report.close()
        setOpenLightId(null)
        setOpenReportId(null)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return {
    brokenLights,
    placeReports,
    reloadPlaceReports,
    menu: report.menu,
    openLight,
    openReport,
    isSheetOpen,
    closeAll,
    startReport(point: LngLat) {
      setOpenLightId(null)
      setOpenReportId(null)
      report.open(point)
    },
    showLight(lampId: string) {
      report.close()
      setOpenReportId(null)
      setOpenLightId(lampId)
    },
    showPlaceReport(id: string) {
      report.close()
      setOpenLightId(null)
      setOpenReportId(id)
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
