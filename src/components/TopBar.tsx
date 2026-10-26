import './topBar.css'

type TopBarProps = {
  /** The small title next to the back button, for example "Walking to Home" or "Your circle". */
  title: string
  /** Where the back button goes. Without it there is no back button, only the title. */
  onBack?: () => void
}

/** The top of most screens in the prototype: "‹" in a pale circle and a small title. */
function TopBar({ title, onBack }: TopBarProps) {
  return (
    <div className="top-bar">
      {onBack && (
        <button type="button" className="top-bar-back" aria-label="Back" onClick={onBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <p className="top-bar-title">{title}</p>
    </div>
  )
}

export default TopBar
