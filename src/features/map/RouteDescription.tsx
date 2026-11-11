import type { RouteReports } from './routeReports.ts'

type RouteDescriptionProps = {
  isMostLights: boolean
  isFastest: boolean
  brokenCount: number
  reports?: RouteReports
}

function RouteDescription({
  isMostLights,
  isFastest,
  brokenCount,
  reports,
}: RouteDescriptionProps) {
  const description = isMostLights
    ? isFastest
      ? 'Better lighting, fast way'
      : 'Better lighting, longer way'
    : isFastest
      ? 'Fast way'
      : 'Longer way'

  return (
    <>
      <span className="route-description">{description}</span>
      <span className="route-tags">
        {reports?.quietLabel && (
          <span
            className="route-tag is-quiet"
            title={`${reports.quietCount} nearby quiet/empty reports. “More quiet” means more such reports per km, not measured noise or crowd levels.`}
          >
            {reports.quietLabel}
          </span>
        )}
        {(reports?.darkCount ?? 0) > 0 && (
          <span className="route-tag is-dark">Less light reported</span>
        )}
        {(reports?.unsafeCount ?? 0) > 0 && (
          <span className="route-tag is-unsafe">Reported unsafe</span>
        )}
        {(reports?.brokenCount ?? brokenCount) > 0 && (
          <span className="route-tag is-broken">Broken light</span>
        )}
        {(reports?.otherCount ?? 0) > 0 && <span className="route-tag is-other">Other report</span>}
      </span>
    </>
  )
}

export default RouteDescription
