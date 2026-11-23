import { useRef, useState } from 'react'
import SosCountdown from './SosCountdown.tsx'
import './sos.css'

type SosButtonProps = {
  onSend: () => Promise<void>
  alreadySent?: boolean
  duringWalk?: boolean
}

function SosButton({ onSend, alreadySent = false }: SosButtonProps) {
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
      setIsOpen(true)
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
        aria-label={alreadySent ? 'SOS sent' : 'SOS'}
        disabled={isSending || alreadySent}
        onClick={() => {
          setFailed(false)
          setIsOpen(true)
        }}
      >
        <span>{alreadySent ? 'SOS sent' : isSending ? 'Sending SOS…' : 'SOS'}</span>
      </button>
      {isOpen && <SosCountdown onCancel={() => setIsOpen(false)} onSend={send} failed={failed} />}
    </>
  )
}

export default SosButton
