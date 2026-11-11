import type { ReactNode, RefObject } from 'react'

type PlannerPanelProps = {
  panelRef: RefObject<HTMLDivElement | null>
  /** The search field and the Home button, at the top of the panel. */
  search: ReactNode
  hint: string
  status: string
}

function PlannerPanel({ panelRef, search, hint, status }: PlannerPanelProps) {
  return (
    <div ref={panelRef} className="planner-panel">
      {search}
      <p className="planner-hint">{hint}</p>
      <p className="planner-status" role="status">
        {status}
      </p>
    </div>
  )
}

export default PlannerPanel
