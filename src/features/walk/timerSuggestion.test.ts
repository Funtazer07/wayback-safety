import { expect, test } from 'vitest'
import { DEFAULT_MINUTES, suggestedMinutes, timerPresets, timerRange } from './timerSuggestion.ts'

test('a planned route starts the timer at its walking time plus 5 minutes, to the minute', () => {
  expect(suggestedMinutes(12 * 60)).toBe(17)
  // 20 minutes and 10 seconds counts as 21 minutes of walking.
  expect(suggestedMinutes(20 * 60 + 10)).toBe(26)
})

test('the slider cannot go below the walking time, and reaches three times it', () => {
  expect(timerRange(30 * 60)).toEqual({ min: 30, max: 90 })
})

test('a short route still lets the user choose up to an hour', () => {
  expect(timerRange(12 * 60)).toEqual({ min: 12, max: 60 })
})

test('a very long route stops at the 3 hours the server allows', () => {
  expect(timerRange(4 * 60 * 60)).toEqual({ min: 180, max: 180 })
  expect(suggestedMinutes(4 * 60 * 60)).toBe(180)
})

test('without a planned route the timer starts at 20 minutes, from 5 minutes to 2 hours', () => {
  expect(suggestedMinutes(null)).toBe(DEFAULT_MINUTES)
  expect(DEFAULT_MINUTES).toBe(20)
  expect(timerRange(null)).toEqual({ min: 5, max: 120 })
})

test('the quick choices fit the route: its walking time plus 5, 10, 15 and 20 minutes', () => {
  expect(timerPresets(12 * 60)).toEqual([17, 22, 27, 32])
  expect(timerPresets(null)).toEqual([10, 15, 20, 30])
  // Near the 3-hour limit the same choice is not shown twice.
  expect(timerPresets(170 * 60)).toEqual([175, 180])
})
