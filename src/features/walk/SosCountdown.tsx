import { useEffect, useRef, useState } from 'react'

type SosCountdownProps = {
  onCancel: () => void
  onSend: () => void
  duringWalk?: boolean
  audience?: string
}

function SosCountdown({ onCancel, onSend, audience = 'Your trusted contacts' }: SosCountdownProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const started = useRef<number | null>(null)
  const frame = useRef<number | null>(null)
  const progress = useRef<SVGCircleElement>(null)
  const [seconds, setSeconds] = useState(3)
  const [isHolding, setIsHolding] = useState(false)

  function stop() {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    started.current = null
    setSeconds(3)
    setIsHolding(false)
    if (progress.current) progress.current.style.strokeDashoffset = '565.49'
  }

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    function reset() {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', reset)
    return () => {
      element?.close()
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      document.removeEventListener('visibilitychange', reset)
    }
  }, [])

  function start() {
    if (started.current !== null) return
    started.current = performance.now()
    setIsHolding(true)
    function update(now: number) {
      if (started.current === null) return
      const elapsed = now - started.current
      const fraction = Math.min(elapsed / 3000, 1)
      if (progress.current)
        progress.current.style.strokeDashoffset = String(565.49 * (1 - fraction))
      setSeconds(Math.max(0, Math.ceil((3000 - elapsed) / 1000)))
      if (fraction === 1) {
        started.current = null
        onSend()
      } else frame.current = requestAnimationFrame(update)
    }
    frame.current = requestAnimationFrame(update)
  }

  return (
    <dialog
      ref={dialog}
      className="walk-sos-countdown"
      aria-labelledby="walk-sos-title"
      onCancel={(event) => {
        event.preventDefault()
        stop()
        onCancel()
      }}
    >
      <h2 id="walk-sos-title">Hold for 3 seconds to send SOS</h2>
      <button
        type="button"
        className="walk-sos-hold"
        aria-label="Hold for 3 seconds to send SOS"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onBlur={stop}
        onContextMenu={(event) => {
          event.preventDefault()
          stop()
        }}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            if (!event.repeat) start()
          }
        }}
        onKeyUp={(event) => {
          if (event.key === ' ' || event.key === 'Enter') stop()
        }}
      >
        <svg viewBox="0 0 204 204" aria-hidden="true">
          <circle cx="102" cy="102" r="90" />
          <circle ref={progress} className="walk-sos-progress" cx="102" cy="102" r="90" />
        </svg>
        <strong>{seconds}s</strong>
        <span>{isHolding ? 'Keep holding' : 'Hold it'}</span>
      </button>
      <p>{audience} can see your last known location after the alert is sent.</p>
      <button
        type="button"
        onClick={() => {
          stop()
          onCancel()
        }}
      >
        Cancel
      </button>
    </dialog>
  )
}

export default SosCountdown
