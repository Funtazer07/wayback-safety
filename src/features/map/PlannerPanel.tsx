import type { RefObject } from 'react'

type PlannerPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>
  hint: string
  status: string
  onLocate: () => void
  onStartOver: () => void
}

function PlannerPanel({ panelRef, hint, status, onLocate, onStartOver }: PlannerPanelProps) {
  return (
    <div ref={panelRef} className="planner-panel">
      <p>{hint}</p>
      <p className="planner-status" role="status">
        {status}
      </p>
      <div className="planner-row">
        <button type="button" className="button-primary" onClick={onLocate}>
          My location
        </button>
        <button type="button" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </div>
  )
}

export default PlannerPanel
