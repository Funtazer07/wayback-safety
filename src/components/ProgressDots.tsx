type ProgressDotsProps = {
  step: number
  total?: number
}

/** The row of dots at the top of each onboarding screen. `step` starts at 1. */
function ProgressDots({ step, total = 5 }: ProgressDotsProps) {
  return (
    <div className="progress-dots" role="img" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <span key={index} className={index + 1 === step ? 'is-current' : undefined} />
      ))}
    </div>
  )
}

export default ProgressDots
