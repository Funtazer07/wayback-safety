import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CheckInButton from '../CheckInButton.tsx'
import CheckInConfirmation from '../CheckInConfirmation.tsx'
import WalkScreen from '../WalkScreen.tsx'
import { PreviewClockContext } from './PreviewClock.ts'
import '../checkInPreview.css'

/** Isolated SCRUM-47 visual prototype. The existing walk screen is rendered without any edits. */
function CheckInPreview() {
  const [walk] = useState(() => ({
    id: 'preview-walk',
    destinationLabel: 'Home',
    startedAt: new Date(),
    deadline: new Date(Date.now() + 20 * 60_000),
    status: 'active' as const,
  }))
  const [stoppedAt, setStoppedAt] = useState<Date | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const [panelText, setPanelText] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    // Put the preview control in the existing panel without editing the shared walk screen.
    setPanelText(previewRef.current?.querySelector<HTMLElement>('.walk-panel-text') ?? null)
  }, [])

  function checkIn() {
    setStoppedAt((previous) => previous ?? new Date())
    setIsConfirmationOpen(true)
  }

  return (
    <PreviewClockContext value={stoppedAt}>
      <div className="check-in-preview" ref={previewRef}>
        <WalkScreen walk={walk} />
        {panelText &&
          createPortal(
            <>
              <CheckInButton onCheckIn={checkIn} />
              <small className="check-in-preview-note">
                {stoppedAt ? 'Arrived · Demo' : 'Prototype · No SMS is sent'}
              </small>
            </>,
            panelText,
          )}
        <CheckInConfirmation
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
        />
      </div>
    </PreviewClockContext>
  )
}

export default CheckInPreview
