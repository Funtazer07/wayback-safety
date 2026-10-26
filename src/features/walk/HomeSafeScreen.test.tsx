import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import HomeSafeScreen from './HomeSafeScreen.tsx'

const { fetchWalkContacts, fetchAlertStatus } = vi.hoisted(() => ({
  fetchWalkContacts: vi.fn(),
  fetchAlertStatus: vi.fn(),
}))

vi.mock('./walk.ts', () => ({ fetchWalkContacts }))
vi.mock('../contacts/contacts.ts', () => ({ fetchAlertStatus }))

beforeEach(() => {
  fetchWalkContacts.mockReset().mockResolvedValue([
    { id: 'c-mum', label: 'Mum', status: 'accepted' },
    { id: 'c-alex', label: 'Alex', status: 'accepted' },
  ])
  fetchAlertStatus.mockReset().mockResolvedValue(new Map())
})

function renderScreen(onDone = vi.fn()) {
  render(
    <HomeSafeScreen walkId="walk-1" endedAt={new Date('2026-10-26T22:26:00')} onDone={onDone} />,
  )
}

test('the user sees that the walk ended, when, and what the check-in did', () => {
  renderScreen()

  expect(screen.getByRole('heading', { name: 'You’re home.' })).toBeInTheDocument()
  expect(screen.getByText('Your walk ended at 22:26.')).toBeInTheDocument()
  const steps = screen.getByRole('list', { name: 'What the check-in did' })
  expect(steps).toHaveTextContent('Timer stopped')
  expect(steps).toHaveTextContent('Location sharing stopped')
  expect(steps).toHaveTextContent('Check-in saved')
})

test('the contacts who were told are named, and the update is called sent, not delivered', async () => {
  renderScreen()

  expect(await screen.findByText('Mum and Alex')).toBeInTheDocument()
  expect(screen.getByText('Safe-arrival update sent.')).toBeInTheDocument()
  expect(screen.queryByText(/delivered/)).not.toBeInTheDocument()
})

test('a contact with notifications off is named as not reached', async () => {
  fetchAlertStatus.mockResolvedValue(new Map([['c-alex', false]]))
  renderScreen()

  expect(await screen.findByText('Mum')).toBeInTheDocument()
  expect(
    screen.getByText('Alex has notifications off, so the update could not reach them.'),
  ).toBeInTheDocument()
})

test('a walk without contacts has no contacts card', async () => {
  fetchWalkContacts.mockResolvedValue([])
  renderScreen()

  await vi.waitFor(() => expect(fetchWalkContacts).toHaveBeenCalledWith('walk-1'))
  expect(screen.queryByRole('region', { name: 'Your contacts' })).not.toBeInTheDocument()
})

test('Back to your places closes the screen', () => {
  const onDone = vi.fn()
  renderScreen(onDone)

  fireEvent.click(screen.getByRole('button', { name: 'Back to your places' }))

  expect(onDone).toHaveBeenCalledOnce()
})
