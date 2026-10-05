import ProgressDots from '../../components/ProgressDots.tsx'

type HowItWorksProps = {
  onNext: () => void
}

const steps = [
  {
    title: 'Start a walk',
    text: 'Choose where you are going (home by default) and set a timer for the walk.',
  },
  {
    title: 'Arrive home, the walk ends',
    text: 'The app notices when you reach home and ends the walk for you. You can also tap "I\'m home".',
  },
  {
    title: 'No arrival? Friends are told',
    text: 'They get a message with a link to see where you are. They do not need the app.',
  },
]

function HowItWorks({ onNext }: HowItWorksProps) {
  return (
    <main className="screen">
      <ProgressDots step={2} />
      <h1>How it works</h1>

      <ol className="onboarding-steps">
        {steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="screen-actions">
        <button type="button" className="button-primary" onClick={onNext}>
          Next
        </button>
      </div>
    </main>
  )
}

export default HowItWorks
