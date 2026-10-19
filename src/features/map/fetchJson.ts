// Outside services (the route planner, the municipality's data) sometimes do not answer for half a
// minute and then work again. So a request gives up after a while and is tried once more, instead
// of leaving the user waiting forever.
const requestTimeout = 12_000

async function fetchOnce(url: string, signal: AbortSignal | undefined): Promise<unknown> {
  const timeout = AbortSignal.timeout(requestTimeout)
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.json()
}

/** Fetches JSON, and tries once more when the first try fails. */
export async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return await fetchOnce(url, signal)
  } catch (error) {
    // Stopped on purpose (the user planned something else): do not try again.
    if (signal?.aborted) throw error
    return fetchOnce(url, signal)
  }
}
