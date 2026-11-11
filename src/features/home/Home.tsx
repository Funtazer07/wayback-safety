import type { PlannedRoute } from '../map/walkRoute.ts'
import RoutePlanner from '../map/RoutePlanner.tsx'
import './home.css'

type HomeProps = {
  userId: string
  displayName: string
  onStartWalk: () => void
  onRouteChange: (route: PlannedRoute | null) => void
  onOpenContacts: () => void
}

function Home({ onStartWalk, onRouteChange }: HomeProps) {
  return (
    <main className="screen home-screen">
      <RoutePlanner onRouteChange={onRouteChange} onStartWalk={onStartWalk} />
    </main>
  )
}

export default Home
