type ArrivedSheetProps = {
  isBusy: boolean
  onHome: () => void
  onNotYet: () => void
}

/** Never ends the walk by itself: being near home is not the same as being safe inside. */
function ArrivedSheet({ isBusy, onHome, onNotYet }: ArrivedSheetProps) {
  return (
    <div className="sheet-backdrop">
      <section
        className="sheet walk-arrived-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walk-arrived-title"
      >
        <div className="screen-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 11l8-7 8 7v9H4z" />
            <path d="M10 20v-6h4v6" />
          </svg>
        </div>
        <h2 id="walk-arrived-title">Are you home?</h2>
        <p className="small">
          You are at the end of your route. Tap I’m home to end the walk and let your contacts know.
        </p>
        <button type="button" className="button-primary" disabled={isBusy} onClick={onHome}>
          Yes, I’m home
        </button>
        <button type="button" disabled={isBusy} onClick={onNotYet}>
          Not yet
        </button>
      </section>
    </div>
  )
}

export default ArrivedSheet
