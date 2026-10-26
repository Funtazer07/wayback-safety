import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import WatchersLine from './WatchersLine.tsx'

test('the walker sees who is watching, in a sentence', () => {
  render(<WatchersLine names={['Mum', 'Alex']} />)

  expect(screen.getByRole('status')).toHaveTextContent('Mum and Alex are watching your walk.')
})

test('one person watching reads naturally too', () => {
  render(<WatchersLine names={['Mum']} />)

  expect(screen.getByRole('status')).toHaveTextContent('Mum is watching your walk.')
})

test('nothing is shown while nobody is watching', () => {
  render(<WatchersLine names={[]} />)

  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
