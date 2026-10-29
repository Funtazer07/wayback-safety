// Outside services sometimes stall for half a minute, so give up after a while and retry once.
const requestTimeout = 12_000

async function fetchOnce(url: string, signal: AbortSignal | undefined): Promise<unknown> {
  const timeout = AbortSignal.timeout(requestTimeout)
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.json()
}

export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return await fetchOnce(url, signal)
  } catch (error) {
    if (signal?.aborted) throw error
    return fetchOnce(url, signal)
  }
}
