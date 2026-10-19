import { afterEach, expect, test, vi } from 'vitest'
import { fetchJson } from './fetchJson.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

function answer(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 503, json: async () => body }
}

test('tries once more when the first try fails', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error('no answer'))
    .mockResolvedValueOnce(answer({ code: 'Ok' }))
  vi.stubGlobal('fetch', fetch)

  await expect(fetchJson('https://example.test/route')).resolves.toEqual({ code: 'Ok' })
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('gives up after the second failed try', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(answer(null, false)))

  await expect(fetchJson('https://example.test/route')).rejects.toThrow('answered 503')
})

test('does not try again when the request was stopped on purpose', async () => {
  const controller = new AbortController()
  const fetch = vi.fn(async () => {
    controller.abort()
    throw new Error('stopped')
  })
  vi.stubGlobal('fetch', fetch)

  await expect(fetchJson('https://example.test/route', controller.signal)).rejects.toThrow()
  expect(fetch).toHaveBeenCalledTimes(1)
})
