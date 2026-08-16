import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  computeProgressComparison,
  type ComparePeriodSelection,
  type ExerciseProgressPeriod,
  type StatComparison,
} from '../analytics/exerciseProgress'
import { computeExerciseRecords, type ExerciseRecords } from '../analytics/personalRecords'
import { EmptyState } from '../components/common/EmptyState'
import { EntrySummary } from '../components/entries/EntrySummary'
import { ComparePeriodSelector } from '../components/progress/ComparePeriodSelector'
import { ProgressStatCard } from '../components/progress/ProgressStatCard'
import { usePhotoUrl } from '../hooks/usePhotoUrl'
import { entryRepository, exerciseRepository } from '../repositories'
import type { Exercise, WorkoutEntry } from '../types'
import { categoryLabel } from '../utils/categories'
import { formatDateLong } from '../utils/dates'

export function ExerciseProgressPage() {
  const { id } = useParams<{ id: string }>()

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [allEntries, setAllEntries] = useState<WorkoutEntry[]>([])
  const [records, setRecords] = useState<ExerciseRecords | null>(null)
  const [loading, setLoading] = useState(true)

  const [selection, setSelection] = useState<ComparePeriodSelection>({ kind: 'preset', preset: 'last30' })
  const [current, setCurrent] = useState<ExerciseProgressPeriod | null>(null)
  const [comparisons, setComparisons] = useState<StatComparison[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([exerciseRepository.get(id), entryRepository.listByExercise(id)]).then(([found, entries]) => {
      if (cancelled) return
      setExercise(found ?? null)
      setAllEntries(entries)
      setLoading(false)
      if (found) {
        computeExerciseRecords(found).then((r) => {
          if (!cancelled) setRecords(r)
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!exercise) return
    let cancelled = false
    computeProgressComparison(exercise, selection).then(({ current: curr, comparisons: cmp }) => {
      if (cancelled) return
      setCurrent(curr)
      setComparisons(cmp)
    })
    return () => {
      cancelled = true
    }
  }, [exercise, selection])

  if (loading) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="page">
        <EmptyState title="Exercise not found" description="It may have been deleted." />
      </div>
    )
  }

  const sortedEntries = [...allEntries].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.createdAt - b.createdAt,
  )
  const [firstEntry] = sortedEntries
  const latestEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : undefined

  return (
    <div className="page">
      <header className="page__header">
        <p className="eyebrow">{categoryLabel(exercise.category)}</p>
        <h1>{exercise.name}</h1>
      </header>

      <ExercisePhoto photoId={exercise.photoId} />
      {exercise.description && <p>{exercise.description}</p>}

      {allEntries.length === 0 ? (
        <EmptyState
          title="No history yet"
          description="Log a training entry for this exercise to start tracking progress."
          action={
            <Link to="/log" className="btn btn--primary btn--lg">
              + Add Training Entry
            </Link>
          }
        />
      ) : (
        <>
          <div className="today-stats">
            <div className="today-stats__tile">
              <span className="stat-figure">{allEntries.length}</span>
              <span className="today-stats__label">Session{allEntries.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          <section className="progress-overview">
            {firstEntry && (
              <div className="progress-overview__entry">
                <h3>First Performance</h3>
                <p className="field__hint">{formatDateLong(firstEntry.date)}</p>
                <EntrySummary exercise={exercise} entry={firstEntry} />
              </div>
            )}
            {latestEntry && latestEntry.id !== firstEntry?.id && (
              <div className="progress-overview__entry">
                <h3>Latest Performance</h3>
                <p className="field__hint">{formatDateLong(latestEntry.date)}</p>
                <EntrySummary exercise={exercise} entry={latestEntry} />
              </div>
            )}
          </section>

          {records && (records.statRecords.length > 0 || records.volumeRecord) && (
            <section className="exercise-frequency">
              <h2>Personal Records</h2>
              <ul className="records-achieved-list__stats">
                {records.statRecords.map((r) => (
                  <li key={r.statId}>
                    {r.label}:{' '}
                    <span className="stat-figure">
                      {r.best.value}
                      {r.unit ?? ''}
                    </span>
                  </li>
                ))}
                {records.volumeRecord && (
                  <li key="volume">
                    {records.volumeRecord.label}:{' '}
                    <span className="stat-figure">
                      {records.volumeRecord.best.value}
                      {records.volumeRecord.unit ?? ''}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}

          <ComparePeriodSelector value={selection} onChange={setSelection} />

          {current && (
            <>
              <div className="today-stats">
                <div className="today-stats__tile">
                  <span className="stat-figure">{current.sessionCount}</span>
                  <span className="today-stats__label">Session{current.sessionCount === 1 ? '' : 's'}</span>
                </div>
                <div className="today-stats__tile">
                  <span className="stat-figure">{current.trainingDays}</span>
                  <span className="today-stats__label">Training Days</span>
                </div>
                {current.perWeekFrequency !== null && (
                  <div className="today-stats__tile">
                    <span className="stat-figure">{current.perWeekFrequency}</span>
                    <span className="today-stats__label">Per Week</span>
                  </div>
                )}
              </div>

              {current.stats.length === 0 && !current.volume ? (
                <p className="placeholder-note">Not enough historical data for comparison yet.</p>
              ) : (
                <div className="progress-stat-cards">
                  {current.stats.map((stat) => (
                    <ProgressStatCard
                      key={stat.statId}
                      stat={stat}
                      comparison={comparisons.find((c) => c.statId === stat.statId)}
                      showComparison={selection.kind !== 'allTime'}
                    />
                  ))}
                  {current.volume && (
                    <ProgressStatCard
                      stat={current.volume}
                      comparison={comparisons.find((c) => c.statId === 'volume')}
                      showComparison={selection.kind !== 'allTime'}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function ExercisePhoto({ photoId }: { photoId: string | null }) {
  const url = usePhotoUrl(photoId)
  if (!url) return null
  return (
    <div className="progress-photo">
      <img src={url} alt="" />
    </div>
  )
}
