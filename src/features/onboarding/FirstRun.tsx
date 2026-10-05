import { useState } from 'react'
import InstallApp from './InstallApp.tsx'
import { isInstalled } from './onboardingStorage.ts'
import Permissions from './Permissions.tsx'
import './onboarding.css'

type FirstRunProps = {
  onDone: () => void
}

/** Screens 4 and 5 of the SCRUM-35 wireframe, shown once after a new user is logged in. */
function FirstRun({ onDone }: FirstRunProps) {
  const [isOnInstallStep, setIsOnInstallStep] = useState(false)

  if (isOnInstallStep) return <InstallApp onDone={onDone} />

  return <Permissions onNext={() => (isInstalled() ? onDone() : setIsOnInstallStep(true))} />
}

export default FirstRun
