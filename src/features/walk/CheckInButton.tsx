import './checkInPreview.css'

type CheckInButtonProps = {
  onCheckIn: () => void
  disabled?: boolean
}

/** SCRUM-47: the check-in control, added beside the existing walk screen. */
function CheckInButton({ onCheckIn, disabled = false }: CheckInButtonProps) {
  return (
    <div className="check-in-actions">
      <button type="button" className="check-in-button" onClick={onCheckIn} disabled={disabled}>
        I’m home
      </button>
    </div>
  )
}

export default CheckInButton
