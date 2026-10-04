import { type FormEvent, useState } from 'react'
import { logInWithPassword, sendLoginEmail, signUpWithPassword } from './auth.ts'
import CheckEmail from './CheckEmail.tsx'
import './auth.css'

function AuthScreen() {
  const [isNewUser, setIsNewUser] = useState(true)
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
    <main className="auth">
      <h1>{isNewUser ? 'Sign up' : 'Log in'}</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
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
            <p className="auth-note">We only ask for your email address. No phone number.</p>
          </>
        )}

        {error && <p role="alert">{error}</p>}

        <button type="submit" className="button-primary" disabled={isBusy}>
          {usesPassword ? passwordButtonText : 'Send me a link'}
        </button>
        <button type="button" onClick={() => setUsesPassword(!usesPassword)}>
          {usesPassword ? 'Use a link instead' : 'Use a password'}
        </button>
      </form>

      <button type="button" className="button-link" onClick={() => setIsNewUser(!isNewUser)}>
        {isNewUser ? 'I have an account' : 'I am new here'}
      </button>
    </main>
  )
}

export default AuthScreen
