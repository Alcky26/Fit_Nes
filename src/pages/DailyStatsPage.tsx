import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDailySummary, type DailySummary } from '../analytics/dailySummary'
import { computeAchievedGroups, type AchievedRecordGroup } from '../analytics/personalRecords'
import { EmptyState } from '../components/common/EmptyState'
import { EntrySummary } from '../components/entries/EntrySummary'
import { RecordsAchievedList } from '../components/stats/RecordsAchievedList'
import { useExercises } from '../hooks/useExercises'
import { formatDateLong, todayIso } from '../utils/dates'
import { addDaysIso } from '../utils/periods'

export function DailyStatsPage() {
  const { date } = useParams<{ date?: string }>()
  const navigate = useNavigate()
  const { exercises, loading: exercisesLoading } = useExercises()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const targetDate = date ?? todayIso()
  const isToday = targetDate === todayIso()

  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [recordGroups, setRecordGroups] = useState<AchievedRecordGroup[]>([])

  useEffect(() => {
    if (exercisesLoading) return
    let cancelled = false
    getDailySummary(targetDate, exercisesById).then(async (result) => {
      if (cancelled) return
      setSummary(result)
      const exerciseIds = Array.from(new Set(result.entries.map((e) => e.exerciseId)))
      const groups = await computeAchievedGroups(exerciseIds, exercisesById, { start: targetDate, end: targetDate })
      if (!cancelled) setRecordGroups(groups)
    })
    return () => {
      cancelled = true
    }
  }, [targetDate, exercisesLoading, exercisesById])

  if (exercisesLoading || !summary) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  const notedSessions = summary.sessions.filter((s) => s.notes.trim().length > 0)

  return (
    <div className="page">
      <header className="page__header">
        <h1>{isToday ? "Today's Training Review" : 'Daily Statistics'}</h1>
      </header>

      <div className="period-nav">
        <button
          type="button"
          className="btn period-nav__arrow"
          aria-label="Previous day"
          onClick={() => navigate(`/stats/daily/${addDaysIso(targetDate, -1)}`)}
        >
          ←
        </button>
        <span className="period-nav__label">{formatDateLong(targetDate)}</span>
        <button
          type="button"
          className="btn period-nav__arrow"
          aria-label="Next day"
          disabled={isToday}
          onClick={() => navigate(`/stats/daily/${addDaysIso(targetDate, 1)}`)}
        >
          →
        </button>
      </div>

      {summary.entries.length === 0 ? (
        <EmptyState
          title={isToday ? 'Nothing logged today yet' : 'Nothing logged this day'}
          description={isToday ? 'Add a training entry to see it summarized here.' : undefined}
          action={
            isToday ? (
              <Link to="/log" className="btn btn--primary btn--lg">
                + Add Training Entry
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="today-stats">
            <div className="today-stats__tile">
              <span className="stat-figure">{summary.exerciseCount}</span>
              <span className="today-stats__label">Exercise{summary.exerciseCount === 1 ? '' : 's'}</span>
            </div>
            <div className="today-stats__tile">
              <span className="stat-figure">{summary.setCount}</span>
              <span className="today-stats__label">Set{summary.setCount === 1 ? '' : 's'}</span>
            </div>
            {summary.durationTotals.map((d) => (
              <div className="today-stats__tile" key={d.unit}>
                <span className="stat-figure">{d.total}</span>
                <span className="today-stats__label">{d.unit}</span>
              </div>
            ))}
          </div>

          <ul className="entry-list__items">
            {summary.entries.map((entry) => {
              const exercise = exercisesById.get(entry.exerciseId)
              return (
                <li key={entry.id} className="entry-row">
                  <div className="entry-row__main">
                    <h3>{exercise?.name ?? 'Deleted exercise'}</h3>
                    {exercise && <EntrySummary exercise={exercise} entry={entry} />}
                    {entry.notes && <p className="entry-row__notes">{entry.notes}</p>}
                  </div>
                </li>
              )
            })}
          </ul>

          {notedSessions.length > 0 && (
            <section className="today-notes">
              <h2>Notes</h2>
              {notedSessions.map((s) => (
                <p key={s.id} className="today-notes__entry">
                  {s.notes}
                </p>
              ))}
            </section>
          )}

          <section className="exercise-frequency">
            <h2>Personal Records</h2>
            <RecordsAchievedList groups={recordGroups} />
          </section>

          <p className="field__hint">
            Flexible progress comparisons against previous sessions arrive with the exercise progress page (Phase
            8).
          </p>
        </>
      )}
    </div>
  )
}
