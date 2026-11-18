import { reportAge } from '../reports/reportAge.ts'
import type { BrokenLight } from './brokenLights.ts'

type BrokenLightSheetProps = {
  light: BrokenLight
  onWorksAgain: () => void
  onClose: () => void
}

function BrokenLightSheet({ light, onWorksAgain, onClose }: BrokenLightSheetProps) {
  return (
    <section className="map-sheet" role="dialog" aria-labelledby="broken-light-title">
      <h2 id="broken-light-title">Reported broken</h2>
      <p>
        {light.street || 'Street light'} · reported {reportAge(new Date(light.reportedAt))}
      </p>
      <button type="button" onClick={onWorksAgain}>
        It works again
      </button>
      <button type="button" className="button-link" onClick={onClose}>
        Close
      </button>
    </section>
  )
}

export default BrokenLightSheet
