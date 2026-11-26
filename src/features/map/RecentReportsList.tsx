import { useId, useState } from 'react'
import { reportAge } from '../reports/reportAge.ts'
import { reportCategories } from '../reports/reportCategories.ts'
import { RECENT_HOURS, type RecentReport } from './recentReports.ts'

type RecentReportsListProps = {
  reports: RecentReport[]
  /** False while there is no location and no route, so nothing could be searched. */
  canSearch: boolean
  now: Date
  onSelect: (report: RecentReport) => void
}

export default function RecentReportsList({
  reports,
  canSearch,
  now,
  onSelect,
}: RecentReportsListProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="recent-reports">
      <button
        type="button"
        className="recent-reports-toggle"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          Recent reports
          {reports.length > 0 && ` (${reports.length})`}
        </span>
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <section id={panelId} className="recent-reports-panel" aria-label="Recent reports">
          <h2>Last {RECENT_HOURS} hours</h2>
          {reports.length === 0 ? (
            <p className="recent-reports-empty">
              {canSearch
                ? 'No reports near you or your route.'
                : 'Turn on your location to see reports near you.'}
            </p>
          ) : (
            <ul className="recent-reports-list">
              {reports.map((report) => (
                <li key={`${report.kind}-${report.id}`}>
                  <RecentReportItem report={report} now={now} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

type RecentReportItemProps = {
  report: RecentReport
  now: Date
  onSelect: (report: RecentReport) => void
}

function RecentReportItem({ report, now, onSelect }: RecentReportItemProps) {
  const category = reportCategories[report.category]

  return (
    <button type="button" className="recent-report-item" onClick={() => onSelect(report)}>
      <span
        className="recent-report-dot"
        style={{ backgroundColor: category.colour }}
        aria-hidden="true"
      />
      <span className="recent-report-content">
        <strong>{category.title}</strong>
        <small>
          {reportAge(report.reportedAt, now)} · {report.nearRoute ? 'Near your route' : 'Near you'}
        </small>
      </span>
    </button>
  )
}
