import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import RunningLateSheet from './RunningLateSheet.tsx'

const deadline = new Date('2026-10-26T22:26:00')

function renderSheet() {
  const onExtend = vi.fn().mockResolvedValue(undefined)
  const onDismiss = vi.fn()
  render(
    <RunningLateSheet
      suggestion={10}
      deadline={deadline}
      onExtend={onExtend}
      onDismiss={onDismiss}
    />,
  )
  return { onExtend, onDismiss }
}

test('the suggestion says how much and the new check-in time', () => {
  renderSheet()

  expect(screen.getByRole('dialog', { name: 'Running late?' })).toBeInTheDocument()
  expect(screen.getByText('Add 10 minutes?')).toBeInTheDocument()
  expect(screen.getByText('New check-in time: 22:36')).toBeInTheDocument()
  expect(screen.getByText('Your timer changes only when you confirm.')).toBeInTheDocument()
})

test('nothing changes until the walker confirms', async () => {
  const { onExtend, onDismiss } = renderSheet()
  expect(onExtend).not.toHaveBeenCalled()

  await act(async () =>
    fireEvent.click(screen.getByRole('button', { name: 'Confirm +10 minutes' })),
  )

  expect(onExtend).toHaveBeenCalledWith(10)
  expect(onDismiss).toHaveBeenCalledOnce()
})

test('another amount can be chosen, or the time kept as it is', async () => {
  const { onExtend, onDismiss } = renderSheet()

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add 15 minutes' })))
  expect(onExtend).toHaveBeenCalledWith(15)

  fireEvent.click(screen.getByRole('button', { name: 'Keep my time' }))
  expect(onDismiss).toHaveBeenCalled()
})
