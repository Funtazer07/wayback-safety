import './checkIn.css'

type CheckInButtonProps = {
  onCheckIn: () => void
  disabled?: boolean
}

/** The "I'm home" button on the walk screen. One tap ends the walk (SCRUM-47, SCRUM-48). */
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
