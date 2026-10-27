import { describeLamp, type Lamp } from './lamps.ts'
import type { ReportMenu } from './useLampReport.ts'

type ReportSheetProps = {
  menu: ReportMenu
  onReport: (lamp: Lamp) => void
  onCancel: () => void
}

function lampText(menu: ReportMenu): string {
  switch (menu.state) {
    case 'looking':
      return 'Looking for the nearest street light…'
    case 'found':
      return describeLamp(menu.lamp)
    case 'already':
      return `${describeLamp(menu.lamp)} is already reported as broken.`
    case 'none':
      return 'No street light found near this spot. Press and hold closer to the light.'
    case 'failed':
      return 'Could not look up the street lights. Check your connection and try again.'
  }
}

function ReportSheet({ menu, onReport, onCancel }: ReportSheetProps) {
  return (
    <section className="map-sheet" role="dialog" aria-labelledby="report-title">
      <h2 id="report-title">Report a problem here</h2>
      <button
        type="button"
        className="report-option"
        disabled={menu.state !== 'found'}
        onClick={() => menu.state === 'found' && onReport(menu.lamp)}
      >
        <span className="report-option-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
            <path d="M3 3l18 18" />
          </svg>
        </span>
        <span className="report-option-text">
          <strong>Broken street light</strong>
          <span>{lampText(menu)}</span>
        </span>
      </button>
      <p className="map-note">Other users see the light on the map, but not who reported it.</p>
      <button type="button" className="button-link" onClick={onCancel}>
        Cancel
      </button>
    </section>
  )
}

export default ReportSheet
