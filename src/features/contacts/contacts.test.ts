import { beforeEach, expect, test, vi } from 'vitest'
import {
  acceptInvite,
  createInvite,
  declineInvite,
  fetchContacts,
  fetchInvite,
  inviteLink,
  removeContact,
  setContactPaused,
} from './contacts.ts'

const { rpc, single, order, eqForSelect, eqForDelete } = vi.hoisted(() => ({
  rpc: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
  eqForSelect: vi.fn(),
  eqForDelete: vi.fn(),
}))

vi.mock('../../lib/supabase.ts', () => ({
  supabase: {
    rpc,
    from: () => ({
      select: () => ({ eq: eqForSelect }),
      delete: () => ({ eq: eqForDelete }),
    }),
  },
}))

const contactRow = {
  id: 'contact-1',
  label: 'Mum',
  status: 'accepted',
  invite_expires_at: null,
}

beforeEach(() => {
  rpc.mockReset()
  single.mockReset()
  order.mockReset()
  eqForSelect.mockReset()
  eqForDelete.mockReset()
  eqForSelect.mockReturnValue({ order })
})

test('an invite link opens the app with the invite secret', () => {
  const link = new URL(inviteLink('secret-123'))

  expect(link.origin).toBe(window.location.origin)
  expect(link.searchParams.get('invite')).toBe('secret-123')
})

test('only the user’s own contacts are listed, with open invites showing when they expire', async () => {
  order.mockResolvedValue({
    data: [
      contactRow,
      {
        id: 'contact-2',
        label: 'Sam',
        status: 'invited',
        invite_expires_at: '2026-10-17T20:00:00Z',
      },
    ],
    error: null,
  })

  const contacts = await fetchContacts('user-1')

  expect(eqForSelect).toHaveBeenCalledWith('user_id', 'user-1')
  expect(contacts).toEqual([
    { id: 'contact-1', label: 'Mum', status: 'accepted', inviteExpiresAt: null },
    {
      id: 'contact-2',
      label: 'Sam',
      status: 'invited',
      inviteExpiresAt: new Date('2026-10-17T20:00:00Z'),
    },
  ])
})

test('listing contacts fails when the server refuses it', async () => {
  const error = new Error('Network error')
  order.mockResolvedValue({ data: null, error })

  await expect(fetchContacts('user-1')).rejects.toBe(error)
})

test('creating an invite sends the name and returns a link with the secret from the server', async () => {
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({
    data: { contact_id: 'contact-2', token: 'secret-123', expires_at: '2026-10-17T20:00:00Z' },
    error: null,
  })

  const invite = await createInvite('Sam')

  expect(rpc).toHaveBeenCalledWith('create_invite', { label: 'Sam' })
  expect(invite.contactId).toBe('contact-2')
  expect(new URL(invite.link).searchParams.get('invite')).toBe('secret-123')
  expect(invite.expiresAt).toEqual(new Date('2026-10-17T20:00:00Z'))
})

test('creating an invite fails when the user already has too many contacts', async () => {
  const error = new Error('You can have at most 10 contacts and open invites')
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({ data: null, error })

  await expect(createInvite('Sam')).rejects.toBe(error)
})

test('opening an invite shows who sent it', async () => {
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({
    data: { inviter_name: 'Anna', expires_at: '2026-10-17T20:00:00Z' },
    error: null,
  })

  const details = await fetchInvite('secret-123')

  expect(rpc).toHaveBeenCalledWith('get_invite', { token: 'secret-123' })
  expect(details).toEqual({ inviterName: 'Anna', expiresAt: new Date('2026-10-17T20:00:00Z') })
})

test('opening an expired invite fails', async () => {
  const error = new Error('This invite link is not valid any more')
  rpc.mockReturnValue({ single })
  single.mockResolvedValue({ data: null, error })

  await expect(fetchInvite('secret-123')).rejects.toBe(error)
})

test('accepting an invite sends its secret to the server', async () => {
  rpc.mockResolvedValue({ data: contactRow, error: null })

  await acceptInvite('secret-123')

  expect(rpc).toHaveBeenCalledWith('accept_invite', { token: 'secret-123' })
})

test('accepting your own invite fails', async () => {
  const error = new Error('You cannot accept your own invite')
  rpc.mockResolvedValue({ data: null, error })

  await expect(acceptInvite('secret-123')).rejects.toBe(error)
})

test('declining an invite sends its secret to the server', async () => {
  rpc.mockResolvedValue({ data: null, error: null })

  await declineInvite('secret-123')

  expect(rpc).toHaveBeenCalledWith('decline_invite', { token: 'secret-123' })
})

test('pausing a contact returns it as paused', async () => {
  rpc.mockResolvedValue({ data: { ...contactRow, status: 'paused' }, error: null })

  const contact = await setContactPaused('contact-1', true)

  expect(rpc).toHaveBeenCalledWith('set_contact_paused', { contact_id: 'contact-1', paused: true })
  expect(contact.status).toBe('paused')
})

test('pausing fails for an invite nobody accepted yet', async () => {
  const error = new Error('No accepted contact with this id')
  rpc.mockResolvedValue({ data: null, error })

  await expect(setContactPaused('contact-2', true)).rejects.toBe(error)
})

test('removing a contact deletes exactly that contact', async () => {
  eqForDelete.mockResolvedValue({ error: null })

  await removeContact('contact-1')

  expect(eqForDelete).toHaveBeenCalledWith('id', 'contact-1')
})

test('removing a contact fails when the server refuses it', async () => {
  const error = new Error('Network error')
  eqForDelete.mockResolvedValue({ error })

  await expect(removeContact('contact-1')).rejects.toBe(error)
})
