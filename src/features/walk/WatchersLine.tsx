import { namesInWords } from './grace.ts'

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
