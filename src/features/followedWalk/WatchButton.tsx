import { useState } from 'react'
import { watchWalk } from './followedWalk.ts'

type WatchButtonProps = {
  walkId: string
  walkerName: string
  /** Whether this contact tapped it before, for example before closing the app. */
  isWatching: boolean
}

/**
 * "I'm watching" (SCRUM-114): one tap tells the walker that someone is looking out, so they do not
 * walk with only a list of names behind them (Studio Krom feedback). It shares nothing new about
 * the walker with the contact.
 */
function WatchButton({ walkId, walkerName, isWatching }: WatchButtonProps) {
  const [hasTapped, setHasTapped] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleWatch() {
    setError(null)
    setIsBusy(true)
    try {
      await watchWalk(walkId)
      setHasTapped(true)
    } catch {
      setError('That did not work. Check your connection and try again.')
    }
    setIsBusy(false)
  }

  if (isWatching || hasTapped) {
    return (
      <p className="followed-box is-safe" role="status">
        You’re watching. {walkerName} can see that on the walk screen.
      </p>
    )
  }

  return (
    <div className="followed-watch">
      <button type="button" className="button-primary" disabled={isBusy} onClick={handleWatch}>
        I’m watching
      </button>
      <p className="followed-note">Lets {walkerName} know you are looking out during this walk.</p>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default WatchButton
