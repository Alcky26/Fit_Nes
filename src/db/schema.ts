import type { DBSchema } from 'idb'
import type { Exercise } from '../types/exercise'
import type { AppSettings, PersonalRecord, StoredPhoto, TrashItem } from '../types/misc'
import type { WorkoutEntry, WorkoutSession } from '../types/workout'

/**
 * Store/index layout as designed in the project plan:
 * - exercises: no secondary indexes — a personal exercise catalogue is
 *   small, so `getAll()` + in-memory filtering (active/archived, category)
 *   is simpler and just as fast as maintaining indexes for it.
 * - workoutSessions / workoutEntries: indexed exactly on the lookups the
 *   brief calls out — exercise id, session id, and date — since these
 *   grow unbounded over years of use and are queried by date range and by
 *   exercise on the progress/analytics pages.
 * - personalRecords is a recomputable cache (see PersonalRecord's own
 *   doc comment) indexed by exercise for fast lookups on the progress page.
 * - trash backs the undo toast and is swept by expiresAt.
 */
export interface FitnessDB extends DBSchema {
  exercises: {
    key: string
    value: Exercise
  }
  workoutSessions: {
    key: string
    value: WorkoutSession
    indexes: { 'by-date': string }
  }
  workoutEntries: {
    key: string
    value: WorkoutEntry
    indexes: {
      'by-exerciseId': string
      'by-sessionId': string
      'by-date': string
    }
  }
  photos: {
    key: string
    value: StoredPhoto
  }
  personalRecords: {
    key: string
    value: PersonalRecord
    indexes: { 'by-exerciseId': string }
  }
  settings: {
    key: string
    value: AppSettings
  }
  trash: {
    key: string
    value: TrashItem
    indexes: { 'by-expiresAt': number }
  }
}
