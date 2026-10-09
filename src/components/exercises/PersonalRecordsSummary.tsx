import type { ExerciseRecords, StatRecord } from '../../analytics/personalRecords'

function RecordLine({ record }: { record: StatRecord }) {
  return (
    <li>
      {record.label}:{' '}
      <span className="stat-figure">
        {record.best.value}
        {record.unit ?? ''}
      </span>
      {record.best.setSummary && <span className="pr-set-context"> (set: {record.best.setSummary})</span>}
    </li>
  )
}

/** Each record is an independent best, so each line also shows the set it
 *  came from — the best weight and the best reps are often different sets. */
export function PersonalRecordsSummary({ records }: { records: ExerciseRecords }) {
  return (
    <ul className="records-achieved-list__stats">
      {records.statRecords.map((r) => (
        <RecordLine key={r.statId} record={r} />
      ))}
      {records.volumeRecord && <RecordLine key="volume" record={records.volumeRecord} />}
    </ul>
  )
}
