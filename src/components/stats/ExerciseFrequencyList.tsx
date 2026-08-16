import type { ExerciseFrequency } from '../../analytics/periodSummary'

interface ExerciseFrequencyListProps {
  frequency: ExerciseFrequency[]
}

export function ExerciseFrequencyList({ frequency }: ExerciseFrequencyListProps) {
  if (frequency.length === 0) {
    return <p className="placeholder-note">No exercises logged in this period.</p>
  }

  return (
    <ul className="exercise-frequency-list">
      {frequency.slice(0, 8).map((f) => (
        <li key={f.exerciseId}>
          <span>{f.exerciseName}</span>
          <span className="stat-figure">{f.entryCount}×</span>
        </li>
      ))}
    </ul>
  )
}
