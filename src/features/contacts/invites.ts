/** copy: there is no share menu here (most laptops), so the screen shows a Copy button. */
export type ShareResult = 'shared' | 'cancelled' | 'copy'

/** The app sends no email itself, so the user shares the link with an app they already use. */
export async function shareInvite(inviterName: string, link: string): Promise<ShareResult> {
  if (!navigator.share) return 'copy'
  try {
    await navigator.share({
      title: 'WayBack Safety',
      text: `${inviterName} would like you as a trusted contact on WayBack Safety. Open the link to accept. It works for 48 hours.`,
      url: link,
    })
    return 'shared'
  } catch (error) {
    // AbortError means the user closed the menu.
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'copy'
  }
}

export async function copyInvite(link: string): Promise<void> {
  await navigator.clipboard.writeText(link)
}

// Google sign-in drops ?invite= from the address, so it is kept here until it is used.
const storageKey = 'wayback.openInvite'
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Removes ?invite= from the address bar, so the secret does not end up in a bookmark. */
export function takeInviteToken(): string | null {
  const url = new URL(window.location.href)
  const fromUrl = url.searchParams.get('invite')
  if (fromUrl) {
    url.searchParams.delete('invite')
    window.history.replaceState(null, '', url)
    try {
      sessionStorage.setItem(storageKey, fromUrl)
    } catch {
      // Storage blocked: the invite opens now, but not after signing in.
    }
  }
  let token = fromUrl
  try {
    token ??= sessionStorage.getItem(storageKey)
  } catch {
    // Storage blocked: only the address bar counts.
  }
  return token && tokenPattern.test(token) ? token : null
}

export function forgetInviteToken(): void {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Nothing was stored.
  }
}
