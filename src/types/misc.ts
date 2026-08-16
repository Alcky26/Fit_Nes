/** Optimized exercise photo. Normal storage is always a compressed Blob —
 *  see the "Exercise Photos" section of the plan for the WebP/canvas
 *  pipeline. Only JSON backups re-encode this as base64. */
export interface StoredPhoto {
  id: string
  blob: Blob
  mimeType: string
  width: number
  height: number
}

export type ThemeMode = 'system' | 'light' | 'dark'
export type UnitSystem = 'metric' // imperial is a documented future option, not built now

export interface AppSettings {
  key: 'app' // singleton row
  theme: ThemeMode
  units: UnitSystem
}

/** A cached-but-recomputable personal-record row. Never the source of
 *  truth — always derivable from workout entries, so edits/deletes can
 *  invalidate and recompute it rather than leaving it stale. */
export interface PersonalRecord {
  id: string
  exerciseId: string
  statId: string
  value: number
  entryId: string
  sessionId: string
  achievedAt: string // YYYY-MM-DD
}

export type TrashEntityType = 'exercise' | 'session' | 'entry'

/** Short-lived record backing the "Undo" toast after a delete. */
export interface TrashItem {
  id: string
  entityType: TrashEntityType
  payload: unknown
  deletedAt: number
  expiresAt: number
}
