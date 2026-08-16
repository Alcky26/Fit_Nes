import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { computeExerciseRecords, recordsSetByEntry } from '../analytics/personalRecords'
import { EmptyState } from '../components/common/EmptyState'
import { EntryForm, type EntryFormValues } from '../components/entries/EntryForm'
import { ExercisePicker } from '../components/entries/ExercisePicker'
import { useExercises } from '../hooks/useExercises'
import { entryRepository, sessionRepository } from '../repositories'
import type { Exercise, WorkoutEntry, WorkoutSession } from '../types'

export function SessionEntryFormPage() {
  const { sessionId, entryId } = useParams<{ sessionId: string; entryId?: string }>()
  const navigate = useNavigate()
  const { exercises, loading: exercisesLoading } = useExercises()

  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [existingEntry, setExistingEntry] = useState<WorkoutEntry | null>(null)
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setLoading(true)
    Promise.all([sessionRepository.get(sessionId), entryId ? entryRepository.get(entryId) : Promise.resolve(undefined)]).then(
      ([foundSession, foundEntry]) => {
        if (cancelled) return
        setSession(foundSession ?? null)
        setExistingEntry(foundEntry ?? null)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [sessionId, entryId])

  useEffect(() => {
    if (existingEntry && exercises.length > 0) {
      setSelected(exercises.find((e) => e.id === existingEntry.exerciseId) ?? null)
    }
  }, [existingEntry, exercises])

  async function handleSubmit(values: EntryFormValues) {
    if (!session || !selected) return
    setBusy(true)
    try {
      const savedEntryId = existingEntry
        ? (await entryRepository.update(existingEntry.id, { sets: values.sets, notes: values.notes })).id
        : (
            await entryRepository.create({
              sessionId: session.id,
              exerciseId: selected.id,
              date: session.date,
              sets: values.sets,
              notes: values.notes,
            })
          ).id

      const records = await computeExerciseRecords(selected)
      const newRecords = recordsSetByEntry(records, savedEntryId)

      navigate(`/workouts/${session.id}`, {
        state: newRecords.length > 0 ? { newRecords, exerciseName: selected.name } : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading || exercisesLoading) {
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

  const active = exercises.filter((e) => !e.archived)

  return (
    <div className="page">
      <header className="page__header">
        <h1>{existingEntry ? 'Edit Entry' : 'Add Exercise'}</h1>
      </header>

      {!selected ? (
        active.length === 0 ? (
          <EmptyState title="No exercises yet" description="Add an exercise first from the Exercises tab." />
        ) : (
          <ExercisePicker exercises={active} onSelect={setSelected} />
        )
      ) : (
        <>
          {!existingEntry && (
            <button type="button" className="btn back-link" onClick={() => setSelected(null)}>
              <span aria-hidden="true">←</span> Change exercise
            </button>
          )}
          <h2>{selected.name}</h2>
          <EntryForm
            exercise={selected}
            fixedDate={session.date}
            initial={existingEntry ? { date: existingEntry.date, sets: existingEntry.sets, notes: existingEntry.notes } : undefined}
            submitLabel={existingEntry ? 'Save Changes' : 'Save Entry'}
            busy={busy}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  )
}
