import { useId, useRef, useState, type ReactNode } from 'react'
import './routePanel.css'

type RouteDrawerProps = { children: ReactNode }

function RouteDrawer({ children }: RouteDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const startY = useRef<number | null>(null)
  const contentId = useId()

  return (
    <section
      className={`route-drawer${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label="Route panel"
      onTouchStart={(event) => {
        startY.current = event.touches[0]?.clientY ?? null
      }}
      onTouchEnd={(event) => {
        const endY = event.changedTouches[0]?.clientY
        if (startY.current !== null && endY !== undefined) {
          const distance = endY - startY.current
          if (distance > 50) setIsCollapsed(true)
          else if (distance < -50) setIsCollapsed(false)
        }
        startY.current = null
      }}
    >
      <button
        type="button"
        className="route-drawer-toggle"
        aria-label={isCollapsed ? 'Show route' : 'Hide route details'}
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="route-drawer-grip" aria-hidden="true" />
      </button>
      <div id={contentId} hidden={isCollapsed}>
        {children}
      </div>
    </section>
  )
}

export default RouteDrawer
