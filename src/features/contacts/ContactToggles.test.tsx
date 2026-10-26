import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import type { Contact } from './contacts.ts'
import ContactToggles from './ContactToggles.tsx'

const contacts: Contact[] = [
  { id: 'c-mum', label: 'Mum', status: 'accepted', inviteExpiresAt: null },
  { id: 'c-alex', label: 'Alex', status: 'accepted', inviteExpiresAt: null },
  { id: 'c-pat', label: 'Pat', status: 'paused', inviteExpiresAt: null },
  { id: 'c-sam', label: 'Sam', status: 'invited', inviteExpiresAt: new Date() },
]

test('only contacts who accepted can follow a walk', () => {
  render(
    <ContactToggles
      contacts={contacts}
      isLoading={false}
      selectedIds={['c-mum', 'c-alex']}
      onChange={vi.fn()}
    />,
  )

  expect(screen.getByRole('switch', { name: 'Mum' })).toBeChecked()
  expect(screen.getByRole('switch', { name: 'Alex' })).toBeChecked()
  expect(screen.queryByRole('switch', { name: 'Pat' })).not.toBeInTheDocument()
  expect(screen.queryByRole('switch', { name: 'Sam' })).not.toBeInTheDocument()
})

test('switching a contact off leaves them out of this walk', () => {
  const onChange = vi.fn()
  render(
    <ContactToggles
      contacts={contacts}
      isLoading={false}
      selectedIds={['c-mum', 'c-alex']}
      onChange={onChange}
    />,
  )

  fireEvent.click(screen.getByRole('switch', { name: 'Alex' }))

  expect(onChange).toHaveBeenCalledWith(['c-mum'])
})

test('without contacts the screen says nobody will be alerted', () => {
  render(<ContactToggles contacts={[]} isLoading={false} selectedIds={[]} onChange={vi.fn()} />)

  expect(screen.getByText(/nobody is alerted if you do not check in/)).toBeInTheDocument()
})

test('a contact whose phone cannot get alerts is marked on Start a walk', () => {
  render(
    <ContactToggles
      contacts={[contacts[0], { ...contacts[1], canReceiveAlerts: false }]}
      isLoading={false}
      selectedIds={['c-mum', 'c-alex']}
      onChange={vi.fn()}
    />,
  )

  expect(screen.getByRole('switch', { name: /Alex.*Notifications off/ })).toBeChecked()
  expect(screen.getByRole('switch', { name: 'Mum' })).toBeInTheDocument()
})
