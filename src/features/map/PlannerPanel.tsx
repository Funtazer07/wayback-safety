import type { ReactNode, RefObject } from 'react'

type PlannerPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>
  /** The search field and the Home button, at the top of the panel. */
  search: ReactNode
  hint: string
  status: string
  banner?: ReactNode
  /** Set while routes are shown: the panel shrinks to a × so the map stays free. */
  onStartOver?: () => void
}

function PlannerPanel({ panelRef, search, hint, status, banner, onStartOver }: PlannerPanelProps) {
  if (onStartOver) {
    return (
      <div ref={panelRef} className="planner-panel is-compact">
        <button
          type="button"
          className="planner-close"
          aria-label="Start over"
          onClick={onStartOver}
        >
          <span aria-hidden="true">×</span>
        </button>
        <p className="planner-status" role="status">
          {status}
        </p>
      </div>
    )
  }

  return (
    <div ref={panelRef} className="planner-panel">
      {search}
      <p className="planner-hint">{hint}</p>
      <p className="planner-status" role="status">
        {status}
      </p>
      {banner}
    </div>
  )
}

export default PlannerPanel
