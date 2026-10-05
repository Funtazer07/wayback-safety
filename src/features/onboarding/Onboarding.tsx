import { useState } from 'react'
import AuthScreen from '../auth/AuthScreen.tsx'
import HowItWorks from './HowItWorks.tsx'
import Welcome from './Welcome.tsx'
import './onboarding.css'

type OnboardingProps = {
  /** Called when someone with an existing account logs in: they skip the rest of the onboarding. */
  onExistingUserLogin: () => void
}

type Step = 'welcome' | 'how-it-works' | 'sign-up' | 'log-in'

/** Screens 1 to 3 of the SCRUM-35 wireframe, shown while nobody is logged in. */
function Onboarding({ onExistingUserLogin }: OnboardingProps) {
  const [step, setStep] = useState<Step>('welcome')

  if (step === 'welcome') {
    return <Welcome onStart={() => setStep('how-it-works')} onLogIn={() => setStep('log-in')} />
  }

  if (step === 'how-it-works') {
    return <HowItWorks onNext={() => setStep('sign-up')} />
  }

  if (step === 'log-in') {
    return (
      <AuthScreen
        isNewUser={false}
        onBack={() => setStep('welcome')}
        onSuccess={onExistingUserLogin}
      />
    )
  }

  return <AuthScreen isNewUser onBack={() => setStep('how-it-works')} />
}

export default Onboarding
