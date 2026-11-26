import { useState } from 'react'
import { reportCategories } from '../reports/reportCategories.ts'
import type { RecentReport } from './recentReports.ts'

type Props = {
  reports: RecentReport[]
  now: Date
  onSelect: (report: RecentReport) => void
}

function timeAgo(date: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  return `${hours} hr ago`
}

export default function RecentReportsList({ reports, now, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="recent-reports">
      <button
        type="button"
        className="recent-reports-toggle"
        aria-expanded={isOpen}
        aria-controls="recent-reports-panel"
        onClick={() => setIsOpen((value) => !value)}
      >
        <span>
          Recent reports
          {reports.length > 0 ? ` (${reports.length})` : ''}
        </span>
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <section
          id="recent-reports-panel"
          className="recent-reports-panel"
          aria-label="Recent reports"
        >
          <h2>Last 3 hours</h2>

          {reports.length === 0 ? (
            <p className="recent-reports-empty">No recent reports nearby.</p>
          ) : (
            <ul className="recent-reports-list">
              {reports.map((report) => {
                const category = reportCategories[report.category]

                return (
                  <li key={`${report.kind}-${report.id}`}>
                    <button
                      type="button"
                      className="recent-report-item"
                      onClick={() => onSelect(report)}
                    >
                      <span
                        className="recent-report-dot"
                        style={{
                          backgroundColor: category.colour,
                        }}
                        aria-hidden="true"
                      />

                      <span className="recent-report-content">
                        <strong>{category.title}</strong>
                        <small>
                          {timeAgo(report.reportedAt, now)}
                          {' · '}
                          {report.nearRoute ? 'Near your route' : 'Near you'}
                        </small>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
