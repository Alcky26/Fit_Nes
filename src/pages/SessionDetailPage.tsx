import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { StatRecord } from '../analytics/personalRecords'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { EntrySummary } from '../components/entries/EntrySummary'
import { NewRecordBanner } from '../components/entries/NewRecordBanner'
import { useExercises } from '../hooks/useExercises'
import { entryRepository, sessionRepository, trashRepository } from '../repositories'
import { useUndoToast } from '../state/ToastContext'
import type { WorkoutEntry, WorkoutSession } from '../types'
import { formatDateLong, todayIso } from '../utils/dates'

interface NewRecordState {
  newRecords: StatRecord[]
  exerciseName: string
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const newRecordState = location.state as NewRecordState | undefined
  const showUndoToast = useUndoToast()
  const { exercises } = useExercises()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [entries, setEntries] = useState<WorkoutEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false)
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    const [found, foundEntries] = await Promise.all([sessionRepository.get(id), entryRepository.listBySession(id)])
    setSession(found ?? null)
    setEntries(foundEntries)
    if (found) {
      setTitle(found.title)
      setDate(found.date)
      setNotes(found.notes)
      setStartTime(found.startTime ?? '')
      setEndTime(found.endTime ?? '')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // `load` is redefined each render but only depends on `id`, which is
    // already the effect's dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleSaveDetails() {
    if (!session) return
    setSavingDetails(true)
    try {
      const nextDate = date || session.date
      await sessionRepository.update(session.id, {
        title: title.trim() || 'Workout',
        date: nextDate,
        notes: notes.trim(),
        startTime: startTime || null,
        endTime: endTime || null,
      })
      if (nextDate !== session.date) {
        // Keep each entry's denormalized date in sync with its session.
        for (const entry of entries) {
          await entryRepository.update(entry.id, { date: nextDate })
        }
      }
      await load()
    } finally {
      setSavingDetails(false)
    }
  }

  async function handleDeleteEntry() {
    const entryId = confirmDeleteEntryId
    setConfirmDeleteEntryId(null)
    if (!entryId) return
    const snapshot = entries.find((e) => e.id === entryId)
    if (!snapshot) return
    await trashRepository.put('entry', snapshot)
    await entryRepository.delete(entryId)
    await load()
    showUndoToast('Entry deleted', async () => {
      await entryRepository.restoreDeleted(snapshot)
      await load()
    })
  }

  async function handleDeleteSession() {
    if (!session) return
    setConfirmDeleteSession(false)
    const sessionSnapshot = session
    const entriesSnapshot = entries
    await trashRepository.put('session', { session: sessionSnapshot, entries: entriesSnapshot })
    for (const entry of entriesSnapshot) {
      await entryRepository.delete(entry.id)
    }
    await sessionRepository.delete(sessionSnapshot.id)
    navigate('/')
    showUndoToast('Workout deleted', async () => {
      await sessionRepository.restoreDeleted(sessionSnapshot)
      for (const entry of entriesSnapshot) {
        await entryRepository.restoreDeleted(entry)
      }
    })
  }

  if (loading) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="page">
        <EmptyState title="Workout not found" description="It may already have been deleted." />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <p className="eyebrow">{formatDateLong(session.date)}</p>
        <h1>{session.title}</h1>
      </header>

      {newRecordState && <NewRecordBanner exerciseName={newRecordState.exerciseName} records={newRecordState.newRecords} />}

      <section className="entry-list">
        {entries.length === 0 ? (
          <p className="placeholder-note">No exercises logged yet.</p>
        ) : (
          <ul className="entry-list__items">
            {entries.map((entry) => {
              const exercise = exercisesById.get(entry.exerciseId)
              return (
                <li key={entry.id} className="entry-row">
                  <div className="entry-row__main">
                    <h3>{exercise?.name ?? 'Deleted exercise'}</h3>
                    {exercise && <EntrySummary exercise={exercise} entry={entry} />}
                    {entry.notes && <p className="entry-row__notes">{entry.notes}</p>}
                  </div>
                  <div className="entry-row__actions">
                    <Link to={`/workouts/${session.id}/entries/${entry.id}/edit`} className="btn">
                      Edit
                    </Link>
                    <button type="button" className="btn btn--danger" onClick={() => setConfirmDeleteEntryId(entry.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Link to={`/workouts/${session.id}/entries/new`} className="btn btn--primary">
          + Add Exercise
        </Link>
      </section>

      <section className="session-details">
        <h2>Workout Details</h2>
        <div className="field">
          <label htmlFor="session-title">Title</label>
          <input id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="session-date">Date</label>
          <input id="session-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="session-details__times">
          <div className="field">
            <label htmlFor="session-start">Start time</label>
            <input id="session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="session-end">End time</label>
            <input id="session-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="session-notes">Notes</label>
          <textarea
            id="session-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Felt strong today. Increase weight next time."
          />
        </div>
        <button type="button" className="btn btn--primary" disabled={savingDetails} onClick={handleSaveDetails}>
          {savingDetails ? 'Saving…' : 'Save Details'}
        </button>
      </section>

      <section className="danger-zone">
        <h2>Delete Workout</h2>
        <p>
          Deletes this workout and all {entries.length} logged exercise{entries.length === 1 ? '' : 's'} in it.
        </p>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmDeleteSession(true)}>
          Delete Workout
        </button>
      </section>

      <ConfirmDialog
        open={confirmDeleteEntryId !== null}
        title="Delete this exercise entry?"
        description="You'll get a few seconds to undo right after."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteEntry}
        onCancel={() => setConfirmDeleteEntryId(null)}
      />

      <ConfirmDialog
        open={confirmDeleteSession}
        title="Delete this workout?"
        description={`This removes the workout and all ${entries.length} logged exercise${entries.length === 1 ? '' : 's'} in it. You'll get a few seconds to undo right after.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteSession}
        onCancel={() => setConfirmDeleteSession(false)}
      />
    </div>
  )
}
