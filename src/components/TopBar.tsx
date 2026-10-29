import './topBar.css'

type TopBarProps = {
  title: string
  /** Without it there is no back button. */
  onBack?: () => void
}

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
