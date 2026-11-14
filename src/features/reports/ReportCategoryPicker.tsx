import { categoryOrder, reportCategories } from './reportCategories.ts'
import type { ReportCategory } from './reports.ts'
import artwork from '../../assets/day/report-artwork.png'

const shortLabels = {
  broken_light: 'Broken light',
  quiet: 'Quiet / empty',
  dark_area: 'Dark area',
  unsafe: 'Feels unsafe',
  other: 'Other',
}

type ReportCategoryPickerProps = {
  chosen: ReportCategory | null
  onChoose: (category: ReportCategory) => void
  canReportQuiet?: boolean
}

function ReportCategoryPicker({
  chosen,
  onChoose,
  canReportQuiet = false,
}: ReportCategoryPickerProps) {
  function categoryButton(category: ReportCategory) {
    const { title, text, icon } = reportCategories[category]
    return (
      <button
        key={category}
        type="button"
        className={`report-category${category === 'quiet' ? ' report-quiet' : ''}`}
        aria-pressed={category === chosen}
        disabled={category === 'quiet' && !canReportQuiet}
        title={
          category === 'quiet' && !canReportQuiet
            ? 'Quiet reports need the prepared server update.'
            : undefined
        }
        aria-label={`${title}. ${text}`}
        onClick={() => onChoose(category)}
      >
        <span className={`report-category-art is-${category}`} aria-hidden="true">
          {category === 'dark_area' ? (
            <svg viewBox="0 0 24 24">
              <path d={icon} />
            </svg>
          ) : (
            <img src={artwork} alt="" />
          )}
        </span>
        <span className="report-category-text">
          <strong>{shortLabels[category]}</strong>
        </span>
      </button>
    )
  }

  return (
    <>
      <div className="report-categories" role="group" aria-label="What do you want to report?">
        {categoryButton('broken_light')}
        {categoryButton('quiet')}
        {categoryButton('unsafe')}
        {categoryButton('other')}
      </div>
      <details className="report-extra-categories">
        <summary>More report categories</summary>
        {categoryOrder.filter((category) => category === 'dark_area').map(categoryButton)}
      </details>
      {/* Screen readers already hear this text in the button's name. */}
      {chosen && (
        <p className="report-category-hint" aria-hidden="true">
          {reportCategories[chosen].text}
        </p>
      )}
    </>
  )
}

export default ReportCategoryPicker
