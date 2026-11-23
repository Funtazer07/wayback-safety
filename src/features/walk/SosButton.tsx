import { useRef, useState } from 'react'
import ring from './assets/sos-ring.svg'
import SosCountdown from './SosCountdown.tsx'
import './sos.css'

type SosButtonProps = {
  onSend: () => Promise<void>
}

function SosButton({ onSend }: SosButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const sending = useRef(false)

  async function send() {
    if (sending.current) return
    sending.current = true
    setIsSending(true)
    setIsOpen(false)
    try {
      await onSend()
    } catch {
      setFailed(true)
    } finally {
      sending.current = false
      setIsSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="walk-sos-button"
        aria-label="SOS"
        disabled={isSending}
        onClick={() => {
          setFailed(false)
          setIsOpen(true)
        }}
      >
        <span className="walk-sos-icon" aria-hidden="true">
          <img src={ring} alt="" />!
        </span>
        <span>
          {isSending ? 'Sending SOS…' : 'SOS'}
          <small>Hold to send an alert</small>
        </span>
      </button>
      {failed && <p role="alert">Could not send SOS. Check your connection and try again.</p>}
      {isOpen && <SosCountdown onCancel={() => setIsOpen(false)} onSend={send} />}
    </>
  )
}

export default SosButton
