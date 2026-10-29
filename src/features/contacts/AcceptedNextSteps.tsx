import { isIphone } from '../../lib/install.ts'

type AcceptedNextStepsProps = {
  inviterName: string
}

/**
 * Shown in the browser after accepting. Testers did not expect the second sign-in in the Home Screen
 * app, so it is said before it happens. On iPhone that app has its own storage, apart from Safari.
 */
function AcceptedNextSteps({ inviterName }: AcceptedNextStepsProps) {
  const steps = isIphone()
    ? [
        'Add WayBack to your Home Screen: tap the Share button, then "Add to Home Screen".',
        'Open WayBack from your Home Screen.',
        'Sign in again with the same account. iPhone keeps the Home Screen app apart from Safari, so this is needed once.',
        `Turn on notifications there, so you hear about ${inviterName}’s walks.`,
      ]
    : [
        'Add WayBack to your home screen: tap the menu (three dots), then "Install app".',
        'Open WayBack from your home screen. You stay signed in.',
      ]

  return (
    <section className="card contacts-next-steps" aria-labelledby="contacts-next-steps-title">
      <h2 id="contacts-next-steps-title">What’s next</h2>
      <ol className="numbered-steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </section>
  )
}

export default AcceptedNextSteps
