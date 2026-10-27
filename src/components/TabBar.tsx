import './tabBar.css'

export type Tab = 'places' | 'contacts' | 'account'

type TabBarProps = {
  current: Tab
  onChange: (tab: Tab) => void
}

// Decorative: the word under each icon is the label.
const icons: Record<Tab, string> = {
  places: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  contacts:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-3.5-5.8',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0',
}

const labels: Record<Tab, string> = {
  places: 'Places',
  contacts: 'Contacts',
  account: 'Account',
}

/** No Map tab: Places already has the map. */
function TabBar({ current, onChange }: TabBarProps) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {(Object.keys(labels) as Tab[]).map((tab) => (
        <button
          key={tab}
          type="button"
          className="tab-bar-item"
          aria-current={tab === current ? 'page' : undefined}
          onClick={() => onChange(tab)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={icons[tab]} />
          </svg>
          {labels[tab]}
        </button>
      ))}
    </nav>
  )
}

export default TabBar
