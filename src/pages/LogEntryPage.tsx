import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeExerciseRecords, recordsSetByEntry } from '../analytics/personalRecords'
import { EmptyState } from '../components/common/EmptyState'
import { EntryForm, type EntryFormValues } from '../components/entries/EntryForm'
import { ExercisePicker } from '../components/entries/ExercisePicker'
import { useExercises } from '../hooks/useExercises'
import { entryRepository, sessionRepository } from '../repositories'
import type { Exercise } from '../types'

export function LogEntryPage() {
  const { exercises, loading } = useExercises()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [busy, setBusy] = useState(false)

  const active = exercises.filter((e) => !e.archived)

  async function handleSubmit(values: EntryFormValues) {
    if (!selected) return
    setBusy(true)
    try {
      // One session per calendar day in this fast-path flow — reuse
      // today's (or the chosen date's) session if one already exists,
      // otherwise create it. The data model and repositories already
      // support multiple sessions per day; this is a UI simplification,
      // not a schema limitation.
      const existing = await sessionRepository.listByDate(values.date)
      const session =
        existing[0] ??
        (await sessionRepository.create({
          date: values.date,
          startTime: null,
          endTime: null,
          title: 'Workout',
          notes: '',
        }))

      const newEntry = await entryRepository.create({
        sessionId: session.id,
        exerciseId: selected.id,
        date: values.date,
        sets: values.sets,
        notes: values.notes,
      })

      const records = await computeExerciseRecords(selected)
      const newRecords = recordsSetByEntry(records, newEntry.id)

      navigate(`/workouts/${session.id}`, {
        state: newRecords.length > 0 ? { newRecords, exerciseName: selected.name } : undefined,
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  if (active.length === 0) {
    return (
      <div className="page">
        <EmptyState title="No exercises yet" description="Add an exercise first, then you can log a training entry for it." />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Add Training Entry</h1>
      </header>

      {!selected ? (
        <ExercisePicker exercises={active} onSelect={setSelected} />
      ) : (
        <>
          <button type="button" className="btn back-link" onClick={() => setSelected(null)}>
            <span aria-hidden="true">←</span> Change exercise
          </button>
          <h2>{selected.name}</h2>
          <EntryForm exercise={selected} submitLabel="Save Entry" busy={busy} onSubmit={handleSubmit} />
        </>
      )}
    </div>
  )
}
