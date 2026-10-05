import ProgressDots from '../../components/ProgressDots.tsx'

type InstallAppProps = {
  onDone: () => void
}

function InstallApp({ onDone }: InstallAppProps) {
  return (
    <main className="screen">
      <ProgressDots step={5} />
      <h1>Add WayBack to your home screen</h1>
      <p>So it opens in one tap when you need it.</p>

      <div className="onboarding-preview">
        <img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" />
        <span>WayBack</span>
      </div>

      <section className="card">
        <h2>iPhone</h2>
        <p>Tap Share, then "Add to Home Screen".</p>
      </section>

      <section className="card">
        <h2>Android</h2>
        <p>Tap the menu, then "Install app".</p>
      </section>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onDone}>
          Done, start my first walk
        </button>
        <button type="button" className="button-link" onClick={onDone}>
          Skip for now
        </button>
      </div>
    </main>
  )
}

export default InstallApp
