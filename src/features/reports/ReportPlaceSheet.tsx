import { useState } from 'react'
import type { LngLat } from '../map/geometry.ts'
import ReportCategoryPicker from './ReportCategoryPicker.tsx'
import { NOTE_MAX_LENGTH, type ReportCategory } from './reports.ts'
import { useSendReport } from './useSendReport.ts'
import './reports.css'

type ReportPlaceSheetProps = {
  /** Where the user is now. null while the phone is still looking. */
  position: LngLat | null
  isLocationOff: boolean
  onClose: () => void
  /** After the report is saved, so the map can show it. */
  onSent: () => void
}

/** The report form of SCRUM-96: a category, an optional note, and the spot where the user is. */
function ReportPlaceSheet({ position, isLocationOff, onClose, onSent }: ReportPlaceSheetProps) {
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [note, setNote] = useState('')
  const { send, isSending, isSent, error } = useSendReport(onSent)

  function handleSend() {
    if (!category || !position) return
    const [longitude, latitude] = position
    void send({ category, latitude, longitude, note })
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="sheet report-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-place-title"
        onClick={(event) => event.stopPropagation()}
      >
        {isSent ? (
          <>
            <h2 id="report-place-title">Thank you</h2>
            <p role="status">
              Your report is saved and shown on the map. Other users will not see who sent it or
              where you were exactly.
            </p>
            <button type="button" className="button-primary" onClick={onClose}>
              Back to your walk
            </button>
          </>
        ) : (
          <>
            <h2 id="report-place-title">Report a problem here</h2>
            <ReportCategoryPicker chosen={category} onChoose={setCategory} />
            <label className="report-note">
              Add a short note (optional)
              <textarea
                value={note}
                maxLength={NOTE_MAX_LENGTH}
                rows={2}
                onChange={(event) => setNote(event.target.value)}
              />
              <span className="report-note-help">
                Do not write names or describe people. {note.length} of {NOTE_MAX_LENGTH}{' '}
                characters.
              </span>
            </label>
            {!position && (
              <p className="small" role="status">
                {isLocationOff
                  ? 'Turn on location to report the spot where you are.'
                  : 'Looking for where you are…'}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <button
              type="button"
              className="button-primary"
              disabled={!category || !position || isSending}
              onClick={handleSend}
            >
              {isSending ? 'Sending…' : 'Send report'}
            </button>
            <button type="button" className="button-link" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </section>
    </div>
  )
}

export default ReportPlaceSheet
