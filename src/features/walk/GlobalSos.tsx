import { useRef, useState } from 'react'
import SosButton from './SosButton.tsx'
import SosConfirmation from './SosConfirmation.tsx'
import type { LngLat } from '../map/geometry.ts'
import type { Walk } from './walk.ts'

type GlobalSosProps = {
  walk: Walk | null
  onSend: (position: LngLat | null, requestId: string) => Promise<void>
}

function GlobalSos({ walk, onSend }: GlobalSosProps) {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const requestId = useRef<string | null>(null)

  async function send() {
    requestId.current ??= crypto.randomUUID()
    const position = await new Promise<LngLat | null>((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve([coords.longitude, coords.latitude]),
        () => resolve(null),
        { timeout: 3000, maximumAge: 60000 },
      )
    })
    await onSend(position, requestId.current)
    requestId.current = null
    setIsConfirmed(true)
  }

  return (
    <aside className="walk-global-sos" aria-label="Emergency assistance">
      <SosButton
        duringWalk={Boolean(walk && (walk.status === 'active' || walk.status === 'overdue'))}
        onSend={send}
        alreadySent={Boolean(walk?.sosAt && walk.status !== 'safe')}
        audience={
          walk && walk.status !== 'safe'
            ? 'The contacts selected for this walk'
            : 'All your accepted trusted contacts'
        }
      />
      {isConfirmed && <SosConfirmation onClose={() => setIsConfirmed(false)} />}
    </aside>
  )
}

export default GlobalSos
