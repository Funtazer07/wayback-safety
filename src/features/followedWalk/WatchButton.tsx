import { useState } from 'react'
import { watchWalk } from './followedWalk.ts'

type WatchButtonProps = {
  walkId: string
  walkerName: string
  isWatching: boolean
}

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
