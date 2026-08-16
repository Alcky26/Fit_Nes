import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/common/EmptyState'
import { TrainingCalendar } from '../components/history/TrainingCalendar'
import { WorkoutHistoryCard } from '../components/history/WorkoutHistoryCard'
import { useExercises } from '../hooks/useExercises'
import { useSessions } from '../hooks/useSessions'
import { entryRepository } from '../repositories'
import { getMonthRange } from '../utils/periods'

type ViewMode = 'list' | 'calendar'

const MONTH_YEAR = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export function HistoryPage() {
  const [view, setView] = useState<ViewMode>('list')
  const { sessions, loading } = useSessions()
  const { exercises } = useExercises()

  const [search, setSearch] = useState('')
  const [exerciseFilter, setExerciseFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sessionIdsForExercise, setSessionIdsForExercise] = useState<Set<string> | null>(null)

  useEffect(() => {
    if (exerciseFilter === 'all') {
      setSessionIdsForExercise(null)
      return
    }
    let cancelled = false
    entryRepository.listByExercise(exerciseFilter).then((entries) => {
      if (!cancelled) setSessionIdsForExercise(new Set(entries.map((e) => e.sessionId)))
    })
    return () => {
      cancelled = true
    }
  }, [exerciseFilter])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return sessions
      .filter((s) => !sessionIdsForExercise || sessionIdsForExercise.has(s.id))
      .filter((s) => !dateFrom || s.date >= dateFrom)
      .filter((s) => !dateTo || s.date <= dateTo)
      .filter((s) => !query || s.title.toLowerCase().includes(query) || s.notes.toLowerCase().includes(query))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [sessions, sessionIdsForExercise, dateFrom, dateTo, search])

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const isCurrentCalMonth = calYear === now.getFullYear() && calMonth === now.getMonth() + 1

  const trainingDates = useMemo(() => {
    const range = getMonthRange(calYear, calMonth)
    return new Set(sessions.filter((s) => s.date >= range.start && s.date <= range.end).map((s) => s.date))
  }, [sessions, calYear, calMonth])

  function goToMonth(offset: number) {
    const base = new Date(calYear, calMonth - 1 + offset, 1)
    setCalYear(base.getFullYear())
    setCalMonth(base.getMonth() + 1)
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>History</h1>
      </header>

      <div className="history-view-toggle">
        <button type="button" className={`chip${view === 'list' ? ' chip--active' : ''}`} onClick={() => setView('list')}>
          List
        </button>
        <button type="button" className={`chip${view === 'calendar' ? ' chip--active' : ''}`} onClick={() => setView('calendar')}>
          Calendar
        </button>
      </div>

      {!loading && sessions.length === 0 && (
        <EmptyState title="No workouts yet" description="Log a training entry to see your history here." />
      )}

      {sessions.length > 0 && view === 'list' && (
        <>
          <div className="exercises-filters">
            <input
              className="exercises-filters__search"
              type="search"
              placeholder="Search workouts"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search workouts"
            />
            <select value={exerciseFilter} onChange={(e) => setExerciseFilter(e.target.value)} aria-label="Filter by exercise">
              <option value="all">All exercises</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                  {ex.archived ? ' (Archived)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="history-date-filters">
            <div className="field">
              <label htmlFor="history-from">From</label>
              <input
                id="history-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="history-to">To</label>
              <input id="history-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="placeholder-note">No workouts match your search.</p>
          ) : (
            <ul className="workout-history-list">
              {filtered.map((session) => (
                <li key={session.id}>
                  <WorkoutHistoryCard session={session} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {sessions.length > 0 && view === 'calendar' && (
        <>
          <div className="period-nav">
            <button type="button" className="btn period-nav__arrow" onClick={() => goToMonth(-1)} aria-label="Previous month">
              ←
            </button>
            <span className="period-nav__label">{MONTH_YEAR.format(new Date(calYear, calMonth - 1, 1))}</span>
            <button
              type="button"
              className="btn period-nav__arrow"
              onClick={() => goToMonth(1)}
              disabled={isCurrentCalMonth}
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <TrainingCalendar year={calYear} month={calMonth} trainingDates={trainingDates} />
        </>
      )}
    </div>
  )
}
