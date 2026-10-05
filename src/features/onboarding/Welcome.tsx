import ProgressDots from '../../components/ProgressDots.tsx'

type WelcomeProps = {
  onStart: () => void
  onLogIn: () => void
}

function Welcome({ onStart, onLogIn }: WelcomeProps) {
  return (
    <main className="screen">
      <ProgressDots step={1} />
      {/* Placeholder until the group has a logo and hero illustration. */}
      <div className="onboarding-hero">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
      </div>
      <h1>Get home safe, your way</h1>
      <p>
        WayBack Safety lets someone know you are on your way home, and helps them if you do not
        arrive.
      </p>
      <p>
        <strong>Free. Signing up takes under a minute.</strong>
      </p>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onStart}>
          Get started
        </button>
        <button type="button" className="button-link" onClick={onLogIn}>
          I already have an account
        </button>
      </div>
    </main>
  )
}

export default Welcome
