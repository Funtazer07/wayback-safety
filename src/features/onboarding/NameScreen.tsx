import { type FormEvent, useState } from 'react'
import ProgressDots from '../../components/ProgressDots.tsx'
import './onboarding.css'

type NameScreenProps = {
  onSave: (displayName: string) => Promise<void>
}

/** Screen 2 of the onboarding v2 wireframe: the only thing we ask the user for. */
function NameScreen({ onSave }: NameScreenProps) {
  const [name, setName] = useState('')
  const [isAdult, setIsAdult] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsBusy(true)
    try {
      await onSave(name.trim())
    } catch {
      setError('Could not save your name. Check your connection and try again.')
      setIsBusy(false)
    }
  }

  return (
    <main className="screen">
      <ProgressDots step={2} total={2} />
      <h1>What should we call you?</h1>
      <p>A first name or nickname is enough. Your friend sees it in the message.</p>

      <form className="screen-fill" onSubmit={handleSubmit}>
        <label htmlFor="name">First name or nickname</label>
        <input
          id="name"
          autoComplete="given-name"
          placeholder="e.g. Sam"
          required
          maxLength={40}
          // A name of only spaces would be saved as empty.
          pattern=".*\S.*"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <label className="onboarding-checkbox">
          <input
            type="checkbox"
            required
            checked={isAdult}
            onChange={(event) => setIsAdult(event.target.checked)}
          />
          I am 16 or older
        </label>

        <div className="screen-actions">
          {error && <p role="alert">{error}</p>}
          <button type="submit" className="button-primary" disabled={isBusy}>
            Continue
          </button>
          <p className="onboarding-small">No profile picture, bio, email or password needed.</p>
        </div>
      </form>
    </main>
  )
}

export default NameScreen
