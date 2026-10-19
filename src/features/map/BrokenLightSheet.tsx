import type { BrokenLight } from './brokenLights.ts'

type BrokenLightSheetProps = {
  light: BrokenLight
  onWorksAgain: () => void
  onClose: () => void
}

/** Opens after tapping a broken-light mark: when it was reported, and a way to take it back. */
function BrokenLightSheet({ light, onWorksAgain, onClose }: BrokenLightSheetProps) {
  const reportedAt = new Date(light.reportedAt).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <section className="map-sheet" role="dialog" aria-labelledby="broken-light-title">
      <h2 id="broken-light-title">Reported broken</h2>
      <p>
        {light.street || 'Street light'} · reported {reportedAt}
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
