// The server refuses an SOS that can reach nobody. Retrying cannot fix that, so say what to do.
export function sosFailureText(error: unknown): string {
  const message = error instanceof Object && 'message' in error ? String(error.message) : ''
  if (message.includes('accepted trusted contact')) {
    return 'Nobody can receive your SOS yet. Add a trusted contact and wait until they accept.'
  }
  return 'Could not send SOS. Check your connection and try again.'
}
