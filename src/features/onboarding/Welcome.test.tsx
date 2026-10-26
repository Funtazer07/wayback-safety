import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import Welcome from './Welcome.tsx'

vi.mock('../../lib/supabase.ts', () => ({ supabase: null }))

test('after logging out, the welcome screen says when alerts may still arrive', () => {
  render(<Welcome notice="WayBack could not turn off notifications on this phone." />)

  expect(screen.getByRole('status')).toHaveTextContent(
    'WayBack could not turn off notifications on this phone.',
  )
})

test('without a notice the welcome screen shows no message', () => {
  render(<Welcome />)

  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
