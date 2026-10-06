import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import WalkTimer from './WalkTimer.tsx'

const startedAt = new Date('2026-10-06T22:00:00')
const deadline = new Date('2026-10-06T22:20:00')

test('counts down in minutes and seconds', () => {
  render(
    <WalkTimer startedAt={startedAt} deadline={deadline} now={new Date('2026-10-06T22:07:55')} />,
  )

  expect(screen.getByText('12:05')).toBeInTheDocument()
  expect(screen.getByText('left')).toBeInTheDocument()
  expect(screen.getByRole('timer')).toHaveAccessibleName('13 min left')
})

test('says so in words when time is almost up, not only in colour', () => {
  render(
    <WalkTimer startedAt={startedAt} deadline={deadline} now={new Date('2026-10-06T22:17:00')} />,
  )

  expect(screen.getByText('Almost time')).toBeInTheDocument()
})

test('says time is up after the deadline', () => {
  render(
    <WalkTimer startedAt={startedAt} deadline={deadline} now={new Date('2026-10-06T22:25:00')} />,
  )

  expect(screen.getByText('00:00')).toBeInTheDocument()
  expect(screen.getByRole('timer')).toHaveAccessibleName('Time is up')
})
