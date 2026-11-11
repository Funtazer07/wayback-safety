import type { MapReportChoice } from './mapReportHits.ts'

type MapReportChooserProps = {
  choices: MapReportChoice[]
  onChoose: (choice: MapReportChoice) => void
  onClose: () => void
}

function MapReportChooser({ choices, onChoose, onClose }: MapReportChooserProps) {
  return (
    <section
      className="map-report-chooser"
      aria-label="Reports at this spot"
      onClick={(event) => event.stopPropagation()}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onTouchStartCapture={(event) => event.stopPropagation()}
    >
      <p>Choose a report</p>
      {choices.map((choice, index) => (
        <button type="button" key={`${choice.kind}:${choice.id}`} onClick={() => onChoose(choice)}>
          {choice.label}
          {choices.filter((other) => other.label === choice.label).length > 1
            ? ` (${index + 1})`
            : ''}
        </button>
      ))}
      <button type="button" onClick={onClose}>
        Close reports
      </button>
    </section>
  )
}

export default MapReportChooser
