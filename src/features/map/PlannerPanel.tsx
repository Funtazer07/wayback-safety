import type { RefObject } from 'react'

type PlannerPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>
  hint: string
  status: string
  onStartOver: () => void
}

function PlannerPanel({ panelRef, hint, status, onStartOver }: PlannerPanelProps) {
  return (
    <div ref={panelRef} className="planner-panel">
      <div className="planner-search">
        <span className="planner-search-icon" aria-hidden="true" />
        <input
          type="search"
          aria-label="Destination search (not connected yet)"
          placeholder="Where are you going?"
          disabled
        />
        <button type="button" aria-label="Start over" onClick={onStartOver}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <p className="planner-hint">{hint}</p>
      <p className="planner-status" role="status">
        {status}
      </p>
    </div>
  )
}

export default PlannerPanel
