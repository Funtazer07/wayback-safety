import { useState } from 'react'
import { reportPlace, type NewPlaceReport } from './reports.ts'

/** Sends one place report and remembers how it went, for the report sheet. */
export function useSendReport(onSent: () => void) {
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(report: NewPlaceReport) {
    setError(null)
    setIsSending(true)
    try {
      await reportPlace(report)
      setIsSent(true)
      onSent()
    } catch {
      setError('Could not send your report. Check your connection and try again.')
    }
    setIsSending(false)
  }

  return { send, isSending, isSent, error }
}
