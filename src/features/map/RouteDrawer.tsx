import { useId, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import './routePanel.css'

type RouteDrawerProps = { children: ReactNode }

// Assumption: 60 px is a clear swipe, while a small slip of the thumb is not.
const SWIPE_DISTANCE = 60

/** Swipes count only on the handle, so scrolling the route list never closes the panel. */
function RouteDrawer({ children }: RouteDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const panel = useRef<HTMLElement>(null)
  const startY = useRef<number | null>(null)
  const contentId = useId()

  function follow(event: TouchEvent) {
    const y = event.touches[0]?.clientY
    if (startY.current === null || y === undefined || !panel.current || isCollapsed) return
    // While open, the panel follows the thumb down, so the swipe feels like moving a sheet.
    panel.current.style.transition = 'none'
    panel.current.style.transform = `translateY(${Math.max(0, y - startY.current)}px)`
  }

  function release(event: TouchEvent) {
    const endY = event.changedTouches[0]?.clientY
    if (panel.current) {
      panel.current.style.transition = ''
      panel.current.style.transform = ''
    }
    if (startY.current !== null && endY !== undefined) {
      const distance = endY - startY.current
      if (distance > SWIPE_DISTANCE) setIsCollapsed(true)
      else if (distance < -SWIPE_DISTANCE) setIsCollapsed(false)
    }
    startY.current = null
  }

  return (
    <section
      ref={panel}
      className={`route-drawer${isCollapsed ? ' is-collapsed' : ''}`}
      aria-label="Route panel"
    >
      <button
        type="button"
        className="route-drawer-toggle"
        aria-label={isCollapsed ? 'Show route' : 'Hide route details'}
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
        onClick={() => setIsCollapsed(!isCollapsed)}
        onTouchStart={(event) => {
          startY.current = event.touches[0]?.clientY ?? null
        }}
        onTouchMove={follow}
        onTouchEnd={release}
        onTouchCancel={release}
      >
        <span className="route-drawer-grip" aria-hidden="true" />
      </button>
      {/* Kept in the page while closed, so it can slide; inert keeps it out of reach. */}
      <div
        id={contentId}
        className="route-drawer-body"
        aria-hidden={isCollapsed}
        inert={isCollapsed}
      >
        <div className="route-drawer-inner">{children}</div>
      </div>
    </section>
  )
}

export default RouteDrawer
