import { namesInWords } from './grace.ts'

/**
 * "Mum is watching your walk" on the walk screen (SCRUM-114): the contacts who tapped "I'm
 * watching". Shows nothing until someone did, so a walk without it does not look wrong.
 */
function WatchersLine({ names }: { names: string[] }) {
  if (names.length === 0) return null

  return (
    <p className="walk-watchers" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
      {namesInWords(names)} {names.length === 1 ? 'is' : 'are'} watching your walk.
    </p>
  )
}

export default WatchersLine
