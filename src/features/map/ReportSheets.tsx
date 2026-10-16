import BrokenLightSheet from './BrokenLightSheet.tsx'
import ReportSheet from './ReportSheet.tsx'
import type { useReporting } from './useReporting.ts'

type ReportSheetsProps = {
  reporting: ReturnType<typeof useReporting>
}

/** Whichever reporting sheet is open: the report menu, or a light that is already reported. */
function ReportSheets({ reporting }: ReportSheetsProps) {
  if (reporting.menu) {
    return (
      <ReportSheet
        menu={reporting.menu}
        onReport={reporting.reportBroken}
        onCancel={reporting.closeAll}
      />
    )
  }
  if (reporting.openLight) {
    const { lampId } = reporting.openLight
    return (
      <BrokenLightSheet
        light={reporting.openLight}
        onWorksAgain={() => reporting.worksAgain(lampId)}
        onClose={reporting.closeAll}
      />
    )
  }
  return null
}

export default ReportSheets
