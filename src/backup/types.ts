import type { AppSettings, Exercise, WorkoutEntry, WorkoutSession } from '../types'

export interface BackupPhotoRecord {
  id: string
  mimeType: string
  width: number
  height: number
  /** Base64-encoded, no "data:...;base64," prefix — mimeType is stored
   *  separately above. Normal storage is always a compressed Blob in
   *  IndexedDB (see photoRepository); this encoding exists only for the
   *  portable JSON backup, per section 39. */
  base64: string
}

export interface BackupData {
  schemaVersion: 1
  exportedAt: string
  exercises: Exercise[]
  workoutSessions: WorkoutSession[]
  workoutEntries: WorkoutEntry[]
  settings: AppSettings | null
  photos: BackupPhotoRecord[]
}
