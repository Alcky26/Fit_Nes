import type { Exercise, WorkoutEntry } from '../../types'
import { formatStatValues } from '../../utils/format'

interface EntrySummaryProps {
  exercise: Exercise
  entry: WorkoutEntry
}

export function EntrySummary({ exercise, entry }: EntrySummaryProps) {
  if (!exercise.usesSets) {
    const single = entry.sets[0]
    if (!single) return null
    return <p className="entry-summary">{formatStatValues(exercise.statDefs, single.values)}</p>
  }

  return (
    <ul className="entry-summary entry-summary--sets">
      {entry.sets.map((set) => (
        <li key={set.setNumber}>
          Set {set.setNumber}: {formatStatValues(exercise.statDefs, set.values)}
        </li>
      ))}
    </ul>
  )
}
