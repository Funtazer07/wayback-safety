import { isIphone } from './install.ts'

type InstallSheetProps = {
  onClose: () => void
}

const iphoneSteps = [
  'Tap the Share button at the bottom of Safari.',
  'Scroll down and choose "Add to Home Screen".',
  'Tap "Add" in the top right corner.',
]

// The wireframe only says "Menu, then Install app" for Android; the wording of these steps is ours.
const androidSteps = ['Tap the menu (three dots) in your browser.', 'Choose "Install app".']

/** Screen 3b of the onboarding v2 wireframe. Shows only the steps for this phone. */
function InstallSheet({ onClose }: InstallSheetProps) {
  const steps = isIphone() ? iphoneSteps : androidSteps

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="install-title">Add WayBack to your home screen</h2>
        <p>
          Then it opens in one tap, like a normal app, and can send you reminders during a walk.
        </p>

        <ol className="numbered-steps">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="screen-actions">
          <button type="button" className="button-primary" autoFocus onClick={onClose}>
            Got it
          </button>
          <button type="button" className="button-link" onClick={onClose}>
            Later
          </button>
        </div>
      </div>
    </div>
  )
}

export default InstallSheet
