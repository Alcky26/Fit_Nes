import { useEffect, useState } from 'react'
import { loadExerciseReference, type ExerciseReference } from '../analytics/exerciseReference'
import type { Exercise } from '../types'

/** Loads "what I did last time" data for an exercise. Returns null while
 *  loading (or if loading fails — the reference is a convenience and must
 *  never block logging an entry). */
export function useExerciseReference(exercise: Exercise | null): ExerciseReference | null {
  const [reference, setReference] = useState<ExerciseReference | null>(null)

  useEffect(() => {
    setReference(null)
    if (!exercise) return
    let cancelled = false
    loadExerciseReference(exercise)
      .then((result) => {
        if (!cancelled) setReference(result)
      })
      .catch((error: unknown) => {
        console.error('Could not load exercise reference', error)
      })
    return () => {
      cancelled = true
    }
  }, [exercise])

  return reference
}
