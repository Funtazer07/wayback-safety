import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import MapReportChooser from './MapReportChooser.tsx'

test('the user can open either overlapping report rather than always getting the broken light', () => {
  const onChoose = vi.fn()
  const choices = [
    { id: 'lamp', kind: 'light' as const, label: 'Broken light' },
    { id: 'hazard', kind: 'place' as const, label: 'Feels unsafe' },
  ]
  render(<MapReportChooser choices={choices} onChoose={onChoose} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Feels unsafe' }))
  expect(onChoose).toHaveBeenLastCalledWith(choices[1])
  fireEvent.click(screen.getByRole('button', { name: 'Broken light' }))
  expect(onChoose).toHaveBeenLastCalledWith(choices[0])
})
