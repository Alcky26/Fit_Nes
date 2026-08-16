import type { AchievedRecordGroup } from '../../analytics/personalRecords'

interface RecordsAchievedListProps {
  groups: AchievedRecordGroup[]
}

export function RecordsAchievedList({ groups }: RecordsAchievedListProps) {
  const nonEmpty = groups.filter((g) => g.records.length > 0)

  if (nonEmpty.length === 0) {
    return <p className="placeholder-note">No personal records set in this period.</p>
  }

  return (
    <ul className="records-achieved-list">
      {nonEmpty.map((g) => (
        <li key={g.exerciseId}>
          <h3>{g.exerciseName}</h3>
          <ul className="records-achieved-list__stats">
            {g.records.map((r) => (
              <li key={r.statId}>
                <span aria-hidden="true">🏆</span> {r.label}:{' '}
                <span className="stat-figure">
                  {r.best.value}
                  {r.unit ?? ''}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
