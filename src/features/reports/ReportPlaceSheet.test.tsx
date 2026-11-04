import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import type { LngLat } from '../map/geometry.ts'
import ReportPlaceSheet from './ReportPlaceSheet.tsx'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../lib/supabase.ts', () => ({ supabase: { rpc } }))

// Stratumseind, as a phone would give it.
const stratumseind: LngLat = [5.479134, 51.438527]

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ error: null })
})

function renderSheet(position: LngLat | null = stratumseind, isLocationOff = false) {
  const onClose = vi.fn()
  const onSent = vi.fn()
  render(
    <ReportPlaceSheet
      position={position}
      isLocationOff={isLocationOff}
      onClose={onClose}
      onSent={onSent}
    />,
  )
  return { onClose, onSent }
}

test('the form offers the four categories', () => {
  renderSheet()

  for (const name of [
    /Broken or flickering light/,
    /Dark or unlit area/,
    /Suspicious or unsafe situation/,
    /Other hazard/,
  ]) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
  }
})

test('a report cannot be sent before a category is chosen', () => {
  renderSheet()

  expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: /Dark or unlit area/ }))

  expect(screen.getByRole('button', { name: /Dark or unlit area/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(screen.getByRole('button', { name: 'Send report' })).toBeEnabled()
})

test('sending saves the category, the note and the rounded spot, and then says thank you', async () => {
  const { onSent } = renderSheet()

  fireEvent.click(screen.getByRole('button', { name: /Suspicious or unsafe situation/ }))
  fireEvent.change(screen.getByLabelText(/Add a short note/), {
    target: { value: 'Group shouting at people' },
  })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send report' })))

  expect(rpc).toHaveBeenCalledWith('report_place', {
    category: 'unsafe',
    lat: 51.439,
    lng: 5.479,
    note: 'Group shouting at people',
  })
  expect(screen.getByRole('heading', { name: 'Thank you' })).toBeInTheDocument()
  // So the map fetches the reports again and shows the new one.
  expect(onSent).toHaveBeenCalledOnce()
})

test('a failed report says so and can be sent again', async () => {
  rpc.mockResolvedValue({ error: new Error('network') })
  const { onSent } = renderSheet()

  fireEvent.click(screen.getByRole('button', { name: /Other hazard/ }))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send report' })))

  expect(screen.getByRole('alert')).toHaveTextContent('Could not send your report.')
  expect(screen.getByRole('button', { name: 'Send report' })).toBeEnabled()
  expect(onSent).not.toHaveBeenCalled()
})

test('without a location the report waits, and says to turn location on', () => {
  renderSheet(null, true)

  fireEvent.click(screen.getByRole('button', { name: /Broken or flickering light/ }))

  expect(screen.getByText('Turn on location to report the spot where you are.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled()
})

test('Cancel closes the form without sending anything', () => {
  const { onClose } = renderSheet()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

  expect(onClose).toHaveBeenCalledOnce()
  expect(rpc).not.toHaveBeenCalled()
})
