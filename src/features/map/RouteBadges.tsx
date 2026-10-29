type RouteBadgesProps = {
  isMostLights: boolean
  isFastest: boolean
}

function RouteBadges({ isMostLights, isFastest }: RouteBadgesProps) {
  if (!isMostLights && !isFastest) return null
  return (
    <span className="route-badges">
      {isMostLights && <span className="route-badge">Most street lights</span>}
      {isFastest && <span className="route-badge">Fastest</span>}
    </span>
  )
}

export default RouteBadges
