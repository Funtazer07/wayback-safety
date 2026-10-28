import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import NewContactsCard from './NewContactsCard.tsx'

const { fetchNewContacts } = vi.hoisted(() => ({ fetchNewContacts: vi.fn() }))

vi.mock('./newContacts.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./newContacts.ts')>()),
  fetchNewContacts,
}))
vi.mock('../notifications/NotificationCard.tsx', () => ({
  default: ({ reason }: { reason: string }) => <p>Notification card: {reason}</p>,
}))

const anna = { id: 'contact-anna', label: 'Anna', acceptedAt: new Date('2026-10-27T21:10:00') }

beforeEach(() => {
  localStorage.clear()
  fetchNewContacts.mockReset().mockResolvedValue([anna])
})

afterEach(() => {
  localStorage.clear()
})

async function renderCard(onOpenContacts = vi.fn()) {
  render(<NewContactsCard userId="user-1" onOpenContacts={onOpenContacts} />)
  await act(async () => {})
  return onOpenContacts
}

test('after an accepted invite the app says who now looks out for each other', async () => {
  await renderCard()

  expect(
    screen.getByRole('heading', { name: 'You and Anna now look out for each other' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/Notification card: So you hear about Anna’s walks/)).toBeInTheDocument()
})

test('See contacts opens the contacts, and the card does not come back on this phone', async () => {
  const onOpenContacts = await renderCard()

  fireEvent.click(screen.getByRole('button', { name: 'See contacts' }))
  expect(onOpenContacts).toHaveBeenCalledOnce()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()

  await renderCard()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})

test('Close hides the card without leaving Home', async () => {
  const onOpenContacts = await renderCard()

  fireEvent.click(screen.getByRole('button', { name: 'Close' }))

  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  expect(onOpenContacts).not.toHaveBeenCalled()
})

test('nothing shows without new contacts, or when they cannot be loaded', async () => {
  fetchNewContacts.mockResolvedValue([])
  await renderCard()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()

  fetchNewContacts.mockRejectedValue(new Error('network'))
  await renderCard()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})
