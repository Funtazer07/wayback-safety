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

/**
 * The real walk screen with a 20-minute example walk and no backend, for showing the check-in in
 * a user test (SCRUM-49). Nothing is sent to Supabase; see docs/check-in-preview.md.
 */
function CheckInPreview() {
  const [walk, setWalk] = useState(exampleWalk)

  return (
    <WalkScreen
      // A new key starts the screen from scratch, so the demo can be shown again.
      key={walk.startedAt.getTime()}
      walk={walk}
      onCheckIn={async () => setWalk({ ...walk, status: 'safe' })}
      onDone={() => setWalk(exampleWalk())}
    />
  )
}

export default CheckInPreview
