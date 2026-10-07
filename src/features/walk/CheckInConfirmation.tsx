import { useEffect, useId, useRef } from 'react'
import './checkIn.css'

type CheckInConfirmationProps = {
  isOpen: boolean
  onClose: () => void
}

/** The message after a check-in: the walk has ended. Closing it brings the user back to Home. */
function CheckInConfirmation({ isOpen, onClose }: CheckInConfirmationProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !isOpen) return

    const previousFocus = document.activeElement
    dialog.showModal()

    return () => {
      dialog.close()
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="check-in-confirmation"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <svg className="check-in-confirmation-mark" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M13 33 26 46 52 17" />
      </svg>
      <h2 id={titleId} className="check-in-confirmation-title">
        You arrived safely!
      </h2>
      <div id={descriptionId} className="check-in-confirmation-description">
        {/* The wireframe says "SMS sent to" a contact here. The app cannot send anything yet, so it
            does not claim to. Telling the contacts is built in SCRUM-7. */}
        <p>Your walk has ended and the timer has stopped.</p>
        <p className="check-in-confirmation-note">The app no longer saves where you are.</p>
      </div>
      <div className="check-in-confirmation-actions">
        <button type="button" className="check-in-confirmation-ok" onClick={onClose}>
          OK
        </button>
      </div>
    </dialog>
  )
}

export default CheckInConfirmation
