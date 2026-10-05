import { type FormEvent, useState } from 'react'
import ProgressDots from '../../components/ProgressDots.tsx'
import { logInWithPassword, sendLoginEmail, signUpWithPassword } from './auth.ts'
import CheckEmail from './CheckEmail.tsx'
import './auth.css'

type AuthScreenProps = {
  /** true shows "Create your account" (screen 3 of the onboarding), false shows "Log in". */
  isNewUser: boolean
  onBack: () => void
  /** Called when the login email was sent or the password was accepted. */
  onSuccess?: () => void
}

function AuthScreen({ isNewUser, onBack, onSuccess }: AuthScreenProps) {
  const [usesPassword, setUsesPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isAdult, setIsAdult] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      if (!usesPassword) {
        await sendLoginEmail(email, isNewUser)
        setIsEmailSent(true)
      } else if (isNewUser) {
        const mustConfirmEmail = await signUpWithPassword(email, password)
        setIsEmailSent(mustConfirmEmail)
      } else {
        await logInWithPassword(email, password)
      }
      onSuccess?.()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
    }
    setIsBusy(false)
  }

  if (isEmailSent) {
    return <CheckEmail email={email} onBack={() => setIsEmailSent(false)} />
  }

  const passwordButtonText = isNewUser ? 'Create account' : 'Log in'

  return (
    <main className="screen">
      {isNewUser && <ProgressDots step={3} />}
      <h1>{isNewUser ? 'Create your account' : 'Log in'}</h1>
      {isNewUser && <p>We only ask for your email. No phone number needed.</p>}

      <form className="screen-fill" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {usesPassword && (
          <>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={isNewUser ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        )}

        {isNewUser && (
          <>
            <label className="auth-checkbox">
              <input
                type="checkbox"
                required
                checked={isAdult}
                onChange={(event) => setIsAdult(event.target.checked)}
              />
              I am 16 or older
            </label>
            {/* The Terms and the Privacy statement are not written yet, so these are not links. */}
            <p className="auth-note">
              By continuing you agree to the Terms and the Privacy statement.
            </p>
          </>
        )}

        {error && <p role="alert">{error}</p>}

        <div className="screen-actions">
          <button type="submit" className="button-primary" disabled={isBusy}>
            {usesPassword ? passwordButtonText : 'Send me a sign-in link'}
          </button>
          <button type="button" onClick={() => setUsesPassword(!usesPassword)}>
            {usesPassword ? 'Use a sign-in link instead' : 'Use a password instead'}
          </button>
          <button type="button" className="button-link" onClick={onBack}>
            Back
          </button>
        </div>
      </form>
    </main>
  )
}

export default AuthScreen
