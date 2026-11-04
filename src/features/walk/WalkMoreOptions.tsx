import { useState } from 'react'
import WalkActions from './WalkActions.tsx'

type WalkMoreOptionsProps = {
  onExtend: (minutes: number) => Promise<void>
  onCancel: () => Promise<void>
  /** In the last minutes the extra time is needed most, so it is shown without a tap. */
  isAlmostUp: boolean
}

/** Keeps the walk screen calm: more time and Cancel walk wait behind one button. */
function WalkMoreOptions({ onExtend, onCancel, isAlmostUp }: WalkMoreOptionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (isAlmostUp) return <WalkActions onExtend={onExtend} onCancel={onCancel} />

  return (
    <>
      <button
        type="button"
        className="walk-options-toggle"
        aria-expanded={isOpen}
        aria-controls="walk-options"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Hide extra time and cancel' : 'More time or cancel'}
      </button>
      {isOpen && (
        <div id="walk-options" className="walk-options">
          <WalkActions onExtend={onExtend} onCancel={onCancel} />
        </div>
      )}
    </>
  )
}

export default WalkMoreOptions
