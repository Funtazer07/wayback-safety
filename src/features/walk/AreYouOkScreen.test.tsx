import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import AreYouOkScreen from './AreYouOkScreen.tsx'
import type { Walk } from './walk.ts'

// Due home at 22:20; the server sent "Are you OK?" at 22:20:30.
const walk: Walk = {
  id: 'walk-1',
  destinationLabel: 'Home',
  startedAt: new Date('2026-10-06T22:00:00'),
  deadline: new Date('2026-10-06T22:20:00'),
  status: 'active',
  warnedAt: new Date('2026-10-06T22:20:30'),
}
const twoMinutesLater = new Date('2026-10-06T22:22:30')

function renderScreen(props: Partial<Parameters<typeof AreYouOkScreen>[0]> = {}) {
  const onCheckIn = vi.fn().mockResolvedValue(undefined)
  const onExtend = vi.fn().mockResolvedValue(undefined)
  render(
    <AreYouOkScreen
      walk={walk}
      phase="grace"
      now={twoMinutesLater}
      contactNames={['Mum', 'Alex']}
      onCheckIn={onCheckIn}
      onExtend={onExtend}
      {...props}
    />,
  )
  return { onCheckIn, onExtend }
}

test('during the grace period the user sees who is told and how long until then', () => {
  renderScreen()

  expect(screen.getByRole('heading', { name: 'Are you okay?' })).toBeInTheDocument()
  expect(screen.getByText(/No contact alert has been sent yet/)).toBeInTheDocument()
  // Counted from the warning at 22:20:30, like on the server: 3 minutes left at 22:22:30.
  expect(screen.getByText('We’ll notify Mum and Alex in')).toBeInTheDocument()
  expect(screen.getByText('03:00')).toBeInTheDocument()
})

test('"I’m home" checks the user in', async () => {
  const { onCheckIn } = renderScreen()

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'I’m home' })))

  expect(onCheckIn).toHaveBeenCalledOnce()
})

test('"Add 5 minutes" gives the user 5 more minutes', async () => {
  const { onExtend } = renderScreen()

  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'I’m okay · Add 5 minutes' })),
  )

  expect(onExtend).toHaveBeenCalledWith(5)
})

test('a failed action says so and can be tried again', async () => {
  renderScreen({ onExtend: vi.fn().mockRejectedValue(new Error('network')) })

  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'I’m okay · Add 5 minutes' })),
  )

  expect(screen.getByRole('alert')).toHaveTextContent('Could not add time.')
  expect(screen.getByRole('button', { name: 'I’m okay · Add 5 minutes' })).toBeEnabled()
})

test('when the countdown is over the screen says the contacts are being told', () => {
  renderScreen({ now: new Date('2026-10-06T22:26:00') })

  expect(screen.getByText('We are notifying Mum and Alex now.')).toBeInTheDocument()
})

test('a walk nobody follows does not promise an alert', () => {
  renderScreen({ contactNames: [] })

  expect(
    screen.getByText('Nobody follows this walk, so nobody will be alerted.'),
  ).toBeInTheDocument()
  expect(screen.queryByRole('timer')).not.toBeInTheDocument()
})

test('once overdue the user is told the contacts know, and can still say they are safe', () => {
  renderScreen({ phase: 'overdue', walk: { ...walk, status: 'overdue' } })

  expect(screen.getByRole('heading', { name: 'We told Mum and Alex' })).toBeInTheDocument()
  expect(screen.getByText(/Tap I’m home to let them know you are safe/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'I’m home' })).toBeEnabled()
  // The server does not extend an overdue walk (SCRUM-63).
  expect(screen.queryByRole('button', { name: /Add 5 minutes/ })).not.toBeInTheDocument()
})
