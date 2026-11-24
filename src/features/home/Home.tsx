import type { ReactNode } from 'react'
import type { PlannedRoute } from '../map/walkRoute.ts'
import RoutePlanner from '../map/RoutePlanner.tsx'
import './home.css'

type HomeProps = {
  sosControl?: ReactNode
  userId: string
  displayName: string
  onStartWalk: () => void
  onRouteChange: (route: PlannedRoute | null) => void
  onOpenContacts: () => void
}

function Home({ onStartWalk, onRouteChange, sosControl }: HomeProps) {
  return (
    <main className="screen home-screen">
      <RoutePlanner
        sosControl={sosControl}
        onRouteChange={onRouteChange}
        onStartWalk={onStartWalk}
      />
    </main>
  )
}

export default Home
