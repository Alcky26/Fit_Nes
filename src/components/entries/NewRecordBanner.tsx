import type { StatRecord } from '../../analytics/personalRecords'

interface NewRecordBannerProps {
  exerciseName: string
  records: StatRecord[]
}

export function NewRecordBanner({ exerciseName, records }: NewRecordBannerProps) {
  if (records.length === 0) return null

  return (
    <div className="record-banner" role="status">
      <p className="record-banner__title">
        <span aria-hidden="true">🏆</span> New Personal Record
      </p>
      <p className="record-banner__exercise">{exerciseName}</p>
      <ul className="record-banner__list">
        {records.map((r) => (
          <li key={r.statId}>
            <span className="stat-figure">
              {r.best.value}
              {r.unit ?? ''}
            </span>{' '}
            <span>{r.label}</span>
            {r.previousBest && (
              <span className="record-banner__previous">
                Previous best: {r.previousBest.value}
                {r.unit ?? ''}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
