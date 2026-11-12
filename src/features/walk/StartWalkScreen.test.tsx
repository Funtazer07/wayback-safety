import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import StartWalkScreen from './StartWalkScreen.tsx'

vi.mock('../contacts/useContacts.ts', () => ({
  useContacts: () => ({ contacts: [], isLoading: false }),
}))
vi.mock('../notifications/NotificationCard.tsx', () => ({ default: () => null }))

test.each([14 * 60, 17 * 60, 17 * 60 + 10])(
  'the route duration of %i seconds sets the initial timer and is sent when starting',
  async (seconds) => {
    const onStart = vi.fn().mockResolvedValue(undefined)
    render(
      <StartWalkScreen
        userId="test"
        plannedRoute={{ coordinates: [], seconds, metres: 1400, destinationLabel: 'Home' }}
        onStart={onStart}
        onBack={vi.fn()}
      />,
    )
    const minutes = Math.ceil(seconds / 60)
    expect(screen.getByText(`${minutes} min`, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(`${minutes} min walk · 1.4 km`)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start walk' }))
    expect(onStart).toHaveBeenCalledWith({ destinationLabel: 'Home', minutes, contactIds: [] })
  },
)
