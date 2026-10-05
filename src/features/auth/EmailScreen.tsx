import { type FormEvent, useState } from 'react'
import { logInWithPassword, signUpWithPassword } from './auth.ts'

type EmailScreenProps = {
  onBack: () => void
}

/**
 * The fallback for people without a Google account. Not in the onboarding v2 wireframe: the
 * group added it because Google alone would lock those people out.
 */
function EmailScreen({ onBack }: EmailScreenProps) {
  const [isNewUser, setIsNewUser] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mustConfirmEmail, setMustConfirmEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      // On success the session changes and App shows the next screen.
      if (isNewUser) {
        setMustConfirmEmail(await signUpWithPassword(email, password))
      } else {
        await logInWithPassword(email, password)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Try again.')
    }
    setIsBusy(false)
  }

  if (mustConfirmEmail) {
    return (
      <main className="screen">
        <h1>Check your email</h1>
        <p>
          We sent an email to <strong>{email}</strong>. Tap the link in it, then come back here and
          log in.
        </p>
        <div className="screen-actions">
          <button
            type="button"
            className="button-primary"
            onClick={() => {
              setMustConfirmEmail(false)
              setIsNewUser(false)
            }}
          >
            Log in
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="screen">
      <h1>{isNewUser ? 'Sign up with email' : 'Log in with email'}</h1>

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
        {isNewUser && <p className="onboarding-small">At least 8 characters.</p>}

        <div className="screen-actions">
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="button-primary" disabled={isBusy}>
            {isNewUser ? 'Create account' : 'Log in'}
          </button>
          <button type="button" onClick={() => setIsNewUser(!isNewUser)}>
            {isNewUser ? 'I already have an account' : 'Create a new account'}
          </button>
          <button type="button" className="button-link" onClick={onBack}>
            Back
          </button>
        </div>
      </form>
    </main>
  )
}

export default EmailScreen
