type CancelWalkSheetProps = {
  isBusy: boolean
  error: string | null
  onConfirm: () => void
  onKeepWalking: () => void
}

/** Asked first: after a cancel, nobody is alerted if the user does not get home. */
function CancelWalkSheet({ isBusy, error, onConfirm, onKeepWalking }: CancelWalkSheetProps) {
  return (
    <div className="sheet-backdrop" onClick={onKeepWalking}>
      <section
        className="sheet walk-cancel-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walk-cancel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="walk-cancel-mark" aria-hidden="true">
          ✕
        </div>
        <h2 id="walk-cancel-title">Cancel this walk?</h2>
        <p className="small">
          Your trusted contacts will no longer be alerted if you do not check in. They are told that
          you stopped the walk.
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="button" className="walk-confirm-cancel" disabled={isBusy} onClick={onConfirm}>
          Confirm cancel
        </button>
        <button type="button" disabled={isBusy} onClick={onKeepWalking}>
          Keep walking
        </button>
      </section>
    </div>
  )
}

export default CancelWalkSheet
