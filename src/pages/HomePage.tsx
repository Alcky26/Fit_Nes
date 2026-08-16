import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDailySummary, type DailySummary } from '../analytics/dailySummary'
import { EmptyState } from '../components/common/EmptyState'
import { useExercises } from '../hooks/useExercises'
import { useRecentSessions } from '../hooks/useRecentSessions'
import { formatDateLong, todayIso } from '../utils/dates'

// Daily/weekly/monthly/yearly stats, personal records, and comparisons
// with previous sessions arrive in Phase 6/7 once the full analytics
// engine and PR system exist. Today's totals below are real, computed
// straight from today's entries — nothing here is a placeholder.
export function HomePage() {
  const { exercises, loading } = useExercises()
  const { sessions, loading: sessionsLoading } = useRecentSessions()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const activeCount = exercises.filter((e) => !e.archived).length

  const [today, setToday] = useState<DailySummary | null>(null)

  useEffect(() => {
    if (loading) return
    let cancelled = false
    getDailySummary(todayIso(), exercisesById).then((summary) => {
      if (!cancelled) setToday(summary)
    })
    return () => {
      cancelled = true
    }
  }, [loading, exercisesById])

  return (
    <div className="page page--home">
      <header className="page__header">
        <h1>Fitness Dashboard</h1>
      </header>

      {!loading && activeCount === 0 && (
        <EmptyState
          title="Start Tracking Your Training"
          description="You don't have any exercises yet."
          action={
            <Link to="/exercises/new" className="btn btn--primary btn--lg">
              + Add Exercise
            </Link>
          }
        />
      )}

      {!loading && activeCount > 0 && (
        <>
          <div className="quick-actions">
            <Link to="/log" className="btn btn--primary btn--lg">
              + Add Training Entry
            </Link>
            <div className="quick-actions__row">
              <Link to="/exercises/new" className="btn">
                + Add Exercise
              </Link>
              <Link to="/today" className="btn">
                Review Today's Training
              </Link>
            </div>
          </div>

          <section className="today-summary">
            <h2>Today's Training</h2>
            {!today ? (
              <p className="placeholder-note">Loading…</p>
            ) : today.entries.length === 0 ? (
              <p className="placeholder-note">No training logged today yet.</p>
            ) : (
              <div className="today-stats">
                <div className="today-stats__tile">
                  <span className="stat-figure">{today.exerciseCount}</span>
                  <span className="today-stats__label">Exercise{today.exerciseCount === 1 ? '' : 's'}</span>
                </div>
                <div className="today-stats__tile">
                  <span className="stat-figure">{today.setCount}</span>
                  <span className="today-stats__label">Set{today.setCount === 1 ? '' : 's'}</span>
                </div>
                {today.durationTotals.map((d) => (
                  <div className="today-stats__tile" key={d.unit}>
                    <span className="stat-figure">{d.total}</span>
                    <span className="today-stats__label">{d.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="stats-links">
            <h2>Statistics</h2>
            <div className="stats-links__row">
              <Link to="/today" className="btn">
                Daily
              </Link>
              <Link to="/stats/weekly" className="btn">
                Weekly
              </Link>
              <Link to="/stats/monthly" className="btn">
                Monthly
              </Link>
              <Link to="/stats/yearly" className="btn">
                Yearly
              </Link>
            </div>
          </section>

          <section className="recent-workouts">
            <h2>Recent Workouts</h2>
            {sessionsLoading ? (
              <p className="placeholder-note">Loading…</p>
            ) : sessions.length === 0 ? (
              <p className="placeholder-note">No workouts logged yet. Personal records arrive in Phase 7.</p>
            ) : (
              <ul className="recent-workouts__list">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link to={`/workouts/${session.id}`} className="recent-workout-card">
                      <span className="recent-workout-card__date">{formatDateLong(session.date)}</span>
                      <span className="recent-workout-card__title">{session.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
