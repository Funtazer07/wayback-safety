import { useEffect, useRef } from 'react'

type SosConfirmationProps = {
  onClose: () => void
}

function SosConfirmation({ onClose }: SosConfirmationProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="walk-sos-countdown walk-sos-confirmation"
      aria-labelledby="walk-sos-confirmed"
      onCancel={onClose}
    >
      <h2 id="walk-sos-confirmed">Alert sent</h2>
      <svg className="walk-sos-success" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" />
        <path d="m25 52 17 17 34-40" />
      </svg>
      <p role="status">Your SOS was sent to your trusted contacts.</p>
      <button type="button" onClick={onClose}>
        Back to app
      </button>
    </dialog>
  )
}

export default SosConfirmation
