// SCRUM-60: getting an invite link to the contact, and back into the app on their side.

/**
 * How the link was passed on.
 * - shared:    the phone's share menu was used (WhatsApp, Mail, Messages...).
 * - cancelled: the user closed the share menu. The link still works; they can share it again.
 * - copy:      no share menu here (most laptops), so the screen shows a Copy button instead.
 */
export type ShareResult = 'shared' | 'cancelled' | 'copy'

/**
 * Opens the phone's own share menu with the invite. Decided on 25 Oct: we send no email ourselves
 * (SCRUM-66), so the user sends the link with an app they already use.
 */
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
    // AbortError: the user closed the menu. Anything else: sharing is blocked here, so copy instead.
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'copy'
  }
}

/** Copies the link. Fails when the browser does not allow it; the link is then shown to select. */
export async function copyInvite(link: string): Promise<void> {
  await navigator.clipboard.writeText(link)
}

// The link opens the app with ?invite=<secret>. Signing in first (Google sends the user away and
// back) loses that part of the address, so it is kept here for this tab until it is used, the same
// way as ?walk= (src/features/followedWalk/followedWalk.ts).
const storageKey = 'wayback.openInvite'
// The secret is a UUID (create_invite in 0005_contacts.sql).
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The invite the app was opened with, from ?invite= or from before signing in. Removes ?invite= from
 * the address bar, so the secret does not stay visible or end up in a bookmark.
 */
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

/** The invite was answered or closed: do not open it again. */
export function forgetInviteToken(): void {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // Nothing was stored.
  }
}
