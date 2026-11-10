import { categoryOrder, reportCategories } from './reportCategories.ts'
import type { ReportCategory } from './reports.ts'

type ReportCategoryPickerProps = {
  chosen: ReportCategory | null
  onChoose: (category: ReportCategory) => void
}

// The icon is only decoration: the title says what the category is.
function ReportCategoryPicker({ chosen, onChoose }: ReportCategoryPickerProps) {
  return (
    <div className="report-categories" role="group" aria-label="What do you want to report?">
      {categoryOrder.map((category) => {
        const { title, text, icon } = reportCategories[category]
        return (
          <button
            key={category}
            type="button"
            className="report-category"
            aria-pressed={category === chosen}
            onClick={() => onChoose(category)}
          >
            <span className="report-category-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d={icon} />
              </svg>
            </span>
            <span className="report-category-text">
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default ReportCategoryPicker
