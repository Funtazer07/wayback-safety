import { useState } from 'react'
import type { Walk } from '../walk.ts'
import WalkScreen from '../WalkScreen.tsx'

function exampleWalk(): Walk {
  return {
    id: 'preview-walk',
    destinationLabel: 'Home',
    startedAt: new Date(),
    deadline: new Date(Date.now() + 20 * 60_000),
    status: 'active',
  }
}

/** For user tests, without a backend. See docs/check-in-preview.md. */
function CheckInPreview() {
  const [walk, setWalk] = useState(exampleWalk)

  return (
    <WalkScreen
      // A new key restarts the demo.
      key={walk.startedAt.getTime()}
      walk={walk}
      onCheckIn={async () => setWalk({ ...walk, status: 'safe' })}
      onDone={() => setWalk(exampleWalk())}
    />
  )
}

export default CheckInPreview
