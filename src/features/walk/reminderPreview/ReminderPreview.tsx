import { useState } from 'react'
import CancelWalkSheet from '../CancelWalkSheet.tsx'
import RunningLateSheet from '../RunningLateSheet.tsx'
import WalkReminder from '../WalkReminder.tsx'
import WalkTimer from '../WalkTimer.tsx'
import { addMinutes, formatClock, isReminderDue } from '../time.ts'
import { useNow } from '../useNow.ts'

type View = 'walk' | 'extend' | 'cancel' | 'locked' | 'ended'

/** SCRUM-62: isolated interactive prototype. No account, location or server calls. */
function ReminderPreview() {
  const [startedAt] = useState(() => new Date())
  const [deadline, setDeadline] = useState(() => addMinutes(startedAt, 1))
  const [view, setView] = useState<View>('walk')
  const [notice, setNotice] = useState('')
  const now = useNow()
  async function extend(minutes: number) {
    setDeadline(addMinutes(deadline, minutes))
    setNotice(
      `Added ${minutes} minutes. Your new check-in time is ${formatClock(addMinutes(deadline, minutes))}.`,
    )
    setView('walk')
  }
  return (
    <div className="reminder-preview">
      <aside className="reminder-preview-tools">
        <h1>Walk reminder</h1>
        <p>SCRUM-62 / SCRUM-64 · Prototype only. No real walk or push is sent.</p>
        <div>
          {(['walk', 'extend', 'cancel', 'locked'] as const).map((state) => (
            <button
              key={state}
              type="button"
              aria-pressed={view === state}
              onClick={() => setView(state)}
            >
              {
                {
                  walk: 'Walk screen',
                  extend: 'Extend time',
                  cancel: 'Cancel walk',
                  locked: 'Lock-screen push',
                }[state]
              }
            </button>
          ))}
        </div>
      </aside>
      <main className="screen reminder-preview-phone">
        {view === 'ended' ? (
          <>
            <div className="screen-icon" aria-hidden="true">
              ✓
            </div>
            <h1>Walk ended</h1>
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => {
                setDeadline(addMinutes(now, 1))
                setView('walk')
              }}
            >
              Try again
            </button>
          </>
        ) : view === 'locked' ? (
          <>
            <p className="walk-centered small">Illustrative lock screen</p>
            <p className="reminder-preview-clock">{formatClock(now)}</p>
            <button
              type="button"
              className="card reminder-preview-push"
              onClick={() => setView('extend')}
            >
              <span className="walk-label">WayBack · now</span>
              <strong>Need more time?</strong>
              <span className="small">
                Your check-in is due at {formatClock(deadline)}. Open WayBack to add time or say
                you’re home.
              </span>
            </button>
            <p className="small">
              Tap the notification to review your time. It never extends your deadline
              automatically.
            </p>
          </>
        ) : (
          <>
            <p className="walk-label">Walking to Home</p>
            <h1>Need more time?</h1>
            <p className="small">Your timer changes only when you confirm.</p>
            <div className="card walk-row">
              <WalkTimer startedAt={startedAt} deadline={deadline} now={now} />
              <div>
                <p className="walk-destination">Home</p>
                <p className="small">Check in by {formatClock(deadline)}</p>
              </div>
            </div>
            {isReminderDue(deadline, now) ? (
              <WalkReminder deadline={deadline} now={now} onReview={() => setView('extend')} />
            ) : (
              <button type="button" className="walk-extend" onClick={() => setView('extend')}>
                Review check-in time
              </button>
            )}
            {notice && <p role="status">{notice}</p>}
            <div className="screen-actions">
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setNotice('You checked in safely. Timer and location sharing stopped (demo).')
                  setView('ended')
                }}
              >
                I’m home
              </button>
              <button type="button" className="button-danger" onClick={() => setView('cancel')}>
                Cancel walk…
              </button>
            </div>
          </>
        )}
        {view === 'extend' && (
          <RunningLateSheet
            suggestion={10}
            deadline={deadline}
            onExtend={extend}
            onDismiss={() => setView('walk')}
          />
        )}
        {view === 'cancel' && (
          <CancelWalkSheet
            isBusy={false}
            error={null}
            onConfirm={() => {
              setNotice('Walk cancelled (demo). No check-in will follow.')
              setView('ended')
            }}
            onKeepWalking={() => setView('walk')}
          />
        )}
      </main>
    </div>
  )
}
export default ReminderPreview
