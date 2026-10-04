# Code patterns

How we write code in this project, with examples to copy. If you are unsure, find a file that does
something similar and follow it.

The examples below show the shape of the code. Features that are not built yet (walk, map) are used
as illustrations only; check Jira for what they must actually do.

## Words you will see

| Word      | Meaning                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| Component | A piece of the screen, written as a function. A button, a card, a whole page   |
| Props     | The settings you pass to a component, like the text on a button                |
| State     | Something a component remembers and that can change, like "is the menu open"   |
| Hook      | A function starting with `use` that gives a component state or other abilities |
| Type      | A description of what data looks like, so the editor can warn about mistakes   |
| Feature   | One part of the app that belongs together: onboarding, walk, map               |

## Where does my file go?

```
src/
  features/
    walk/                  everything for the walk-home timer
      WalkScreen.tsx       a screen
      WalkScreen.test.tsx  its test, next to it
      TimeLeft.tsx         a smaller part used by that screen
      minutesUntil.ts      logic used by that screen
      walk.css             styles for this feature
  components/              parts used by more than one feature (Button, ...)
  lib/                     helpers without any UI (formatting, service clients)
```

Ask yourself: is it only used by one feature? Then it goes in that feature's folder. Move it to
`components/` or `lib/` only when a second feature needs it.

## Naming

| Thing             | Style               | Example                      |
| ----------------- | ------------------- | ---------------------------- |
| Component + file  | PascalCase          | `TimeLeft` in `TimeLeft.tsx` |
| Hook + file       | camelCase, `use...` | `useCountdown.ts`            |
| Other functions   | camelCase, a verb   | `formatDistance`             |
| Types             | PascalCase          | `Walk`, `TimeLeftProps`      |
| Folders           | lowercase           | `features/walk`              |
| True/false values | `is...` / `has...`  | `isOpen`, `hasCheckedIn`     |

Use full words: `minutesLeft`, not `minL`.

## Pattern 1: a component

One component per file. Describe its props in a type right above it.

```tsx
type TimeLeftProps = {
  minutesLeft: number
}

function TimeLeft({ minutesLeft }: TimeLeftProps) {
  return <p className="time-left">{minutesLeft} min left</p>
}

export default TimeLeft
```

Using it somewhere else:

```tsx
<TimeLeft minutesLeft={12} />
```

Keep components small. If a file grows past roughly 100 lines, split a part of it into its own
component.

## Pattern 2: state (something that changes)

```tsx
import { useState } from 'react'

function ReminderToggle() {
  const [isOn, setIsOn] = useState(false)

  return (
    <button type="button" aria-pressed={isOn} onClick={() => setIsOn(!isOn)}>
      Reminder {isOn ? 'on' : 'off'}
    </button>
  )
}

export default ReminderToggle
```

Never change state directly (`isOn = true`). Always use the `set...` function, otherwise the screen
does not update.

## Pattern 3: logic goes outside the component

Calculations and rules go in a plain function in their own file. That keeps components readable and
makes the logic easy to test.

```ts
// features/walk/minutesUntil.ts
export function minutesUntil(deadline: Date, now: Date): number {
  const milliseconds = deadline.getTime() - now.getTime()
  return Math.max(0, Math.ceil(milliseconds / 60_000))
}
```

## Pattern 4: describe your data with a type

```ts
type Walk = {
  id: string
  deadline: Date
  status: 'active' | 'safe' | 'overdue'
}
```

Now the editor warns you when you misspell `status` or forget the deadline. Do not use `any`; it
switches these warnings off.

## Pattern 5: loading, error, empty

Anything that comes from the server can be slow, fail, or be empty. Every screen that loads data
handles all of these, in this order:

```tsx
if (isLoading) return <p>Loading…</p>
if (error) return <p role="alert">Something went wrong. Try again.</p>
if (walks.length === 0) return <p>No walks yet.</p>

return <WalkList walks={walks} />
```

## Pattern 6: a test

A test file sits next to the file it tests and has the same name plus `.test`.

For logic:

```ts
import { expect, test } from 'vitest'
import { minutesUntil } from './minutesUntil.ts'

test('rounds up to whole minutes', () => {
  const now = new Date('2026-10-04T22:00:00')
  const deadline = new Date('2026-10-04T22:10:30')

  expect(minutesUntil(deadline, now)).toBe(11)
})
```

For a component, test what the user sees, not how the code works inside:

```tsx
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import TimeLeft from './TimeLeft.tsx'

test('shows the minutes left', () => {
  render(<TimeLeft minutesLeft={12} />)

  expect(screen.getByText('12 min left')).toBeInTheDocument()
})
```

See `src/App.test.tsx` for a real one.

## Styling

- Plain CSS. One CSS file per feature, imported in that feature's screen. Global basics are in
  `src/index.css`.
- Class names in lowercase with dashes: `time-left`, `walk-screen`.
- Design for a phone first. The app is used outside, at night, with one hand: large text, large
  buttons (at least 44 × 44 px), strong contrast.
- Use `rem` for sizes, not `px`, so the app respects the user's text size setting.

## Accessibility

- Use the real element: `<button>` for actions, `<a>` for links. Not a clickable `<div>`.
- Every input has a `<label>`. Every image has `alt` text.
- Do not rely on colour alone to show meaning (lit / unlit, safe / overdue). Add text or an icon.

## Text in the app

The app is planned in Dutch and English. How translations will work is not decided yet, so for now:
write user-facing text in English, keep it in the component (not hidden in helper functions), and
keep sentences whole instead of gluing pieces together. That makes it easy to translate later.

## Don'ts

- Do not add a new package (`npm install something`) without asking the group first.
- Do not put keys, passwords or real addresses in the code. Example data uses real Eindhoven street
  names but made-up people.
- Do not show the municipal lamp data as "this light is on". It only says where lamps are.
- Do not leave `console.log` lines or commented-out code in a merge request.
- Do not copy code you do not understand. Ask, or add a comment saying what you are unsure about.
