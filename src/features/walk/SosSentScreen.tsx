import { useState } from 'react'
import signal from './assets/sos-sent-signal.svg'

type SosSentScreenProps = {
  onCheckIn: () => Promise<void>
}

function SosSentScreen({ onCheckIn }: SosSentScreenProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function checkIn() {
    setIsBusy(true)
    setFailed(false)
    try {
      await onCheckIn()
    } catch {
      setFailed(true)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="walk-sos-sent" aria-labelledby="walk-sos-sent-title">
      <div className="walk-panel-handle" aria-hidden="true" />
      <div className="walk-sos-sent-heading" role="status">
        <span className="walk-sos-icon" aria-hidden="true">
          <img src={signal} alt="" />!
        </span>
        <h1 id="walk-sos-sent-title">SOS sent</h1>
      </div>
      <p>Your trusted contacts can open the alert to see your latest available location.</p>
      {failed && <p role="alert">Could not check you in. Check your connection and try again.</p>}
      <button type="button" disabled={isBusy} onClick={checkIn}>
        I’m safe
      </button>
    </section>
  )
}

export default SosSentScreen
