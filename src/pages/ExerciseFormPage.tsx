import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { computeExerciseRecords, type ExerciseRecords } from '../analytics/personalRecords'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EmptyState } from '../components/common/EmptyState'
import { ExerciseForm, type ExerciseFormValues } from '../components/exercises/ExerciseForm'
import { entryRepository, exerciseRepository, photoRepository, trashRepository } from '../repositories'
import { useUndoToast } from '../state/ToastContext'
import type { Exercise } from '../types'

export function ExerciseFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showUndoToast = useUndoToast()

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [busy, setBusy] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [records, setRecords] = useState<ExerciseRecords | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    Promise.all([exerciseRepository.get(id), entryRepository.listByExercise(id)]).then(([found, entries]) => {
      if (cancelled) return
      setExercise(found ?? null)
      setHasHistory(entries.length > 0)
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

  /** Persists the photo choice made in the form and returns the photoId
   *  the exercise record should reference. Cleans up an orphaned previous
   *  photo Blob when it's replaced or removed. */
  async function persistPhoto(values: ExerciseFormValues, previousPhotoId: string | null): Promise<string | null> {
    if (values.photo.kind === 'pending') {
      const saved = await photoRepository.save({
        blob: values.photo.blob,
        mimeType: values.photo.mimeType,
        width: values.photo.width,
        height: values.photo.height,
      })
      if (previousPhotoId && previousPhotoId !== saved.id) {
        await photoRepository.delete(previousPhotoId)
      }
      return saved.id
    }
    if (values.photo.kind === 'existing') {
      return values.photo.photoId
    }
    if (previousPhotoId) {
      await photoRepository.delete(previousPhotoId)
    }
    return null
  }

  async function handleSubmit(values: ExerciseFormValues) {
    setBusy(true)
    try {
      const photoId = await persistPhoto(values, exercise?.photoId ?? null)
      if (exercise) {
        await exerciseRepository.update(exercise.id, {
          name: values.name,
          category: values.category,
          description: values.description,
          usesSets: values.usesSets,
          statDefs: values.statDefs,
          photoId,
        })
      } else {
        await exerciseRepository.create({
          name: values.name,
          category: values.category,
          description: values.description,
          usesSets: values.usesSets,
          statDefs: values.statDefs,
          photoId,
        })
      }
      navigate('/exercises')
    } finally {
      setBusy(false)
    }
  }

  async function handleArchive() {
    if (!exercise) return
    setConfirmOpen(false)
    await exerciseRepository.archive(exercise.id)
    navigate('/exercises')
  }

  async function handleRestore() {
    if (!exercise) return
    await exerciseRepository.restore(exercise.id)
    navigate('/exercises')
  }

  async function handleDelete() {
    if (!exercise) return
    setConfirmOpen(false)
    const snapshot = exercise
    await trashRepository.put('exercise', snapshot)
    await exerciseRepository.hardDelete(snapshot.id)
    navigate('/exercises')
    showUndoToast(`"${snapshot.name}" deleted`, async () => {
      await exerciseRepository.restoreDeleted(snapshot)
    })
  }

  if (loading) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  if (id && !exercise) {
    return (
      <div className="page">
        <EmptyState title="Exercise not found" description="It may already have been deleted." />
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>{exercise ? 'Edit Exercise' : 'Add Exercise'}</h1>
      </header>

      <ExerciseForm initial={exercise ?? undefined} submitLabel={exercise ? 'Save Changes' : 'Add Exercise'} busy={busy} onSubmit={handleSubmit} />

      {exercise && records && (records.statRecords.length > 0 || records.volumeRecord) && (
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

      {exercise && (
        <Link to={`/exercises/${exercise.id}/progress`} className="btn btn--primary progress-link">
          View Progress &amp; Charts
        </Link>
      )}

      {exercise && (
        <section className="danger-zone">
          {exercise.archived ? (
            <>
              <h2>Restore Exercise</h2>
              <p>This exercise is archived and hidden from new workouts. Restore it to use it again.</p>
              <button type="button" className="btn btn--primary" onClick={handleRestore}>
                Restore Exercise
              </button>
            </>
          ) : (
            <>
              <h2>{hasHistory ? 'Archive Exercise' : 'Delete Exercise'}</h2>
              <p>
                {hasHistory
                  ? 'This exercise has workout history, so it gets archived instead of deleted — past entries stay intact and you can restore it later.'
                  : 'This exercise has no workout history yet, so it can be deleted outright.'}
              </p>
              <button type="button" className="btn btn--danger" onClick={() => setConfirmOpen(true)}>
                {hasHistory ? 'Archive Exercise' : 'Delete Exercise'}
              </button>
            </>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={hasHistory ? 'Archive this exercise?' : 'Delete this exercise?'}
        description={
          hasHistory
            ? 'It will be hidden from new workouts but its history stays intact. Restore it any time from the Archived filter.'
            : "This can't be undone from here, but you'll get a few seconds to undo right after."
        }
        confirmLabel={hasHistory ? 'Archive' : 'Delete'}
        destructive={!hasHistory}
        onConfirm={hasHistory ? handleArchive : handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
