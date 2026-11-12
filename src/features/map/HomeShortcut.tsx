import type { SavedHome } from './savedHome.ts'

type HomeShortcutProps = {
  home: SavedHome | null
  isSettingHome: boolean
  onGoHome: (home: SavedHome) => void
  onSetHome: () => void
  onCancel: () => void
  onRemove: () => void
}

/** One tap to walk home. Without a saved home it asks for one, found with the search bar. */
function HomeShortcut({
  home,
  isSettingHome,
  onGoHome,
  onSetHome,
  onCancel,
  onRemove,
}: HomeShortcutProps) {
  if (isSettingHome) {
    return (
      <div className="home-shortcut is-setting">
        <p>Search your home address above and pick it. It is saved on this phone only.</p>
        <div className="home-shortcut-row">
          {home && (
            <button type="button" className="button-link" onClick={onRemove}>
              Remove saved home
            </button>
          )}
          <button type="button" className="button-link" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="home-shortcut home-shortcut-row">
      <button
        type="button"
        className="home-shortcut-go"
        onClick={() => (home ? onGoHome(home) : onSetHome())}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h5v-6h4v6h5V10" />
        </svg>
        {home ? 'Home' : 'Set home'}
      </button>
      {home && (
        <button type="button" className="button-link" onClick={onSetHome}>
          Change home
        </button>
      )}
    </div>
  )
}

export default HomeShortcut
