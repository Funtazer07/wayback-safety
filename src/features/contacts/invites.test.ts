import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { forgetInviteToken, shareInvite, takeInviteToken } from './invites.ts'

const link =
  'https://funtazer07.github.io/wayback-safety/?invite=0ddc2e61-c2a8-4dc4-9586-6656c2bdc63a'
const token = '0ddc2e61-c2a8-4dc4-9586-6656c2bdc63a'

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('the invite opens the phone’s share menu with the link and who it is from', async () => {
  const share = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { share })

  expect(await shareInvite('Anna', link)).toBe('shared')
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({ url: link, text: expect.stringContaining('Anna would like you') }),
  )
})

test('closing the share menu is not an error', async () => {
  vi.stubGlobal('navigator', {
    share: vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')),
  })

  expect(await shareInvite('Anna', link)).toBe('cancelled')
})

test('without a share menu the screen offers to copy the link', async () => {
  vi.stubGlobal('navigator', {})

  expect(await shareInvite('Anna', link)).toBe('copy')
})

test('the invite from the link is read and removed from the address bar', () => {
  window.history.replaceState(null, '', `/?invite=${token}`)

  expect(takeInviteToken()).toBe(token)
  expect(window.location.search).toBe('')
})

test('the invite is remembered through signing in, until it is answered', () => {
  window.history.replaceState(null, '', `/?invite=${token}`)
  takeInviteToken()

  expect(takeInviteToken()).toBe(token)

  forgetInviteToken()
  expect(takeInviteToken()).toBeNull()
})

test('anything that is not an invite secret is ignored', () => {
  window.history.replaceState(null, '', '/?invite=hello')

  expect(takeInviteToken()).toBeNull()
})
