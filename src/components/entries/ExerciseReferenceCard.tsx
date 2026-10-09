import type { ExerciseReference } from '../../analytics/exerciseReference'
import { formatDateLong } from '../../utils/dates'
import { formatExerciseTargets } from '../../utils/format'
import type { Exercise } from '../../types'
import { PersonalRecordsSummary } from '../exercises/PersonalRecordsSummary'
import { EntrySummary } from './EntrySummary'

interface ExerciseReferenceCardProps {
  exercise: Exercise
  reference: ExerciseReference
  /** Copies last time's sets into the form. Omitted when not applicable. */
  onUseLast?: () => void
}

export function ExerciseReferenceCard({ exercise, reference, onUseLast }: ExerciseReferenceCardProps) {
  const { lastEntry, recentNote, records } = reference
  const targets = formatExerciseTargets(exercise)
  const hasRecords = records.statRecords.length > 0 || records.volumeRecord !== null

  if (!targets && !lastEntry && !hasRecords) return null

  return (
    <aside className="reference-card" aria-label="Reminder for this exercise">
      {targets && <p className="reference-card__targets">{targets}</p>}

      {lastEntry && (
        <section>
          <h3>Last time · {formatDateLong(lastEntry.date)}</h3>
          <EntrySummary exercise={exercise} entry={lastEntry} />
          {onUseLast && (
            <button type="button" className="btn" onClick={onUseLast}>
              Use these values
            </button>
          )}
        </section>
      )}

      {recentNote && (
        <section>
          <h3>Last note · {formatDateLong(recentNote.date)}</h3>
          <p className="reference-card__note">{recentNote.text}</p>
        </section>
      )}

      {hasRecords && (
        <section>
          <h3>Personal records</h3>
          <PersonalRecordsSummary records={records} />
        </section>
      )}
    </aside>
  )
}
