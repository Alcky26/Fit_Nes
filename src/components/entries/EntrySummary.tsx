import type { Exercise, StatValues, WorkoutEntry } from '../../types'

interface EntrySummaryProps {
  exercise: Exercise
  entry: WorkoutEntry
}

export function EntrySummary({ exercise, entry }: EntrySummaryProps) {
  if (!exercise.usesSets) {
    const single = entry.sets[0]
    if (!single) return null
    return <p className="entry-summary">{formatValues(exercise, single.values)}</p>
  }

  return (
    <ul className="entry-summary entry-summary--sets">
      {entry.sets.map((set) => (
        <li key={set.setNumber}>
          Set {set.setNumber}: {formatValues(exercise, set.values)}
        </li>
      ))}
    </ul>
  )
}

function formatValues(exercise: Exercise, values: StatValues): string {
  return exercise.statDefs
    .filter((def) => values[def.id] !== undefined && values[def.id] !== '')
    .map((def) => {
      const value = values[def.id]
      return def.unit ? `${value}${def.unit}` : `${value}`
    })
    .join(' · ')
}
