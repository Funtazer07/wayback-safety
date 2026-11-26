import { useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  canShowInstallPrompt,
  isInstalled,
  showInstallPrompt,
  subscribeToInstallPrompt,
} from '../../lib/install.ts'
import InstallSheet from './InstallSheet.tsx'

const DISMISSED_KEY = 'wayback-install-banner-dismissed'

/** On Android it opens Chrome's own install prompt; elsewhere it shows the steps. */
function InstallBanner() {
  const canPrompt = useSyncExternalStore(subscribeToInstallPrompt, canShowInstallPrompt)
  const [isHidden, setIsHidden] = useState(
    () => isInstalled() || localStorage.getItem(DISMISSED_KEY) === 'true',
  )
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  if (isHidden) return null

  async function install() {
    if (!canPrompt) {
      setIsSheetOpen(true)
      return
    }
    if (await showInstallPrompt()) setIsHidden(true)
  }

  return (
    <>
      <div className="home-banner install-banner">
        <p>Add WayBack to your home screen.</p>
        <button type="button" className="button-link" onClick={install}>
          {canPrompt ? 'Install' : 'Show me how'}
        </button>
        <button
          type="button"
          className="install-banner-close"
          aria-label="Not now"
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, 'true')
            setIsHidden(true)
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {/* Outside the map, so the map's buttons and the tab bar do not cover the sheet. */}
      {isSheetOpen &&
        createPortal(<InstallSheet onClose={() => setIsSheetOpen(false)} />, document.body)}
    </>
  )
}

export default InstallBanner
