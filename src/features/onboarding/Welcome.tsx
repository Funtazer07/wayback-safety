import { useState } from 'react'
import ProgressDots from '../../components/ProgressDots.tsx'
import { signInWithGoogle } from '../auth/auth.ts'
import EmailScreen from '../auth/EmailScreen.tsx'
import './onboarding.css'

type WelcomeProps = {
  notice?: string | null
}

function Welcome({ notice = null }: WelcomeProps) {
  const [usesEmail, setUsesEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSignIn() {
    setError(null)
    setIsBusy(true)
    try {
      await signInWithGoogle()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
      setIsBusy(false)
    }
  }

  if (usesEmail) return <EmailScreen onBack={() => setUsesEmail(false)} />

  return (
    <main className="screen">
      <ProgressDots step={1} total={2} />
      {notice && <p role="status">{notice}</p>}
      {/* Placeholder until the group has a logo and hero illustration. */}
      <div className="onboarding-hero">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" />
      </div>
      <h1>Get home safe, your way</h1>
      <p>
        A friend follows your walk home. If you do not arrive, they get a link to see where you are.
      </p>
      <p>
        <strong>Free. Ready in about 30 seconds.</strong>
      </p>

      <div className="screen-actions">
        {error && <p role="alert">{error}</p>}
        {/* No Apple or phone sign-in: both cost money. */}
        <button type="button" className="button-primary" disabled={isBusy} onClick={handleSignIn}>
          Continue with Google
        </button>
        <button type="button" className="button-link" onClick={() => setUsesEmail(true)}>
          Use email instead
        </button>
        {/* Not links yet: the Terms and Privacy statement are not written. */}
        <p className="onboarding-small">
          By continuing you agree to the Terms and the Privacy statement. We never sell your data
          and never ask for your contact book.
        </p>
      </div>
    </main>
  )
}

export default Welcome
