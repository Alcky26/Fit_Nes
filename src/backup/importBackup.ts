import { getDB } from '../db'
import type { BackupData } from './types'

export type ImportMode = 'merge' | 'replace'

export interface ImportResult {
  exercisesImported: number
  sessionsImported: number
  entriesImported: number
  photosImported: number
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

/**
 * Imports a backup that has already passed validateBackup(). 'replace'
 * clears every store first; 'merge' just writes on top — since every
 * record carries its original id, a duplicate id safely overwrites the
 * existing record via idb's `put` (last-write-wins) rather than erroring
 * or duplicating, which is how "handle duplicate ids safely" (section
 * 37) is satisfied here.
 */
export async function importBackup(backup: BackupData, mode: ImportMode): Promise<ImportResult> {
  const db = await getDB()

  if (mode === 'replace') {
    const storeNames = ['exercises', 'workoutSessions', 'workoutEntries', 'photos', 'settings'] as const
    const tx = db.transaction(storeNames, 'readwrite')
    await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()))
    await tx.done
  }

  for (const photo of backup.photos) {
    const blob = base64ToBlob(photo.base64, photo.mimeType)
    await db.put('photos', { id: photo.id, blob, mimeType: photo.mimeType, width: photo.width, height: photo.height })
  }
  for (const exercise of backup.exercises) {
    await db.put('exercises', exercise)
  }
  for (const session of backup.workoutSessions) {
    await db.put('workoutSessions', session)
  }
  for (const entry of backup.workoutEntries) {
    await db.put('workoutEntries', entry)
  }
  if (backup.settings) {
    await db.put('settings', backup.settings)
  }

  return {
    exercisesImported: backup.exercises.length,
    sessionsImported: backup.workoutSessions.length,
    entriesImported: backup.workoutEntries.length,
    photosImported: backup.photos.length,
  }
}
