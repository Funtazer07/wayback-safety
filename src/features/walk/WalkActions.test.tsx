import { act, fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import WalkActions from './WalkActions.tsx'

function renderActions() {
  const onExtend = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn().mockResolvedValue(undefined)
  render(<WalkActions onExtend={onExtend} onCancel={onCancel} />)
  return { onExtend, onCancel }
}

test('+5, +10 and +15 add that many minutes', async () => {
  const { onExtend } = renderActions()

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add 10 minutes' })))

  expect(onExtend).toHaveBeenCalledWith(10)
})

test('adding time says so when it fails, and the buttons work again', async () => {
  const { onExtend } = renderActions()
  onExtend.mockRejectedValue(new Error('network'))

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add 5 minutes' })))

  expect(screen.getByRole('alert')).toHaveTextContent('Could not add time.')
  expect(screen.getByRole('button', { name: 'Add 5 minutes' })).toBeEnabled()
})

test('Cancel walk asks first and says what it means for the contacts', async () => {
  const { onCancel } = renderActions()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel walk' }))
  const sheet = screen.getByRole('dialog', { name: 'Cancel this walk?' })
  expect(sheet).toHaveTextContent('will no longer be alerted')
  expect(onCancel).not.toHaveBeenCalled()

  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' })))
  expect(onCancel).toHaveBeenCalledOnce()
})

test('Keep walking closes the question without cancelling', () => {
  const { onCancel } = renderActions()

  fireEvent.click(screen.getByRole('button', { name: 'Cancel walk' }))
  fireEvent.click(screen.getByRole('button', { name: 'Keep walking' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(onCancel).not.toHaveBeenCalled()
})
