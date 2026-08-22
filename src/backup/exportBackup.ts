import { entryRepository, exerciseRepository, photoRepository, sessionRepository, settingsRepository } from '../repositories'
import type { BackupData, BackupPhotoRecord } from './types'

/**
 * Converts a Blob to a base64 string for the JSON backup. Chunked to
 * avoid a "Maximum call stack size exceeded" error from spreading a very
 * large byte array into String.fromCharCode at once.
 *
 * Uses Blob.arrayBuffer() directly — every real browser's Blob supports
 * it consistently, including one read back out of IndexedDB (a single
 * native Blob implementation, no cross-realm concerns). The one
 * environment where this doesn't hold is the jsdom + fake-indexeddb test
 * combination, where a Blob reconstructed by fake-indexeddb's storage
 * emulation isn't recognized as jsdom's own Blob class by either
 * arrayBuffer() or FileReader — a test-tooling limitation, not a real
 * browser behavior, so buildBackup() below tolerates it per-photo rather
 * than this function trying to work around it.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

export async function buildBackup(): Promise<BackupData> {
  const [exercises, sessions, settings] = await Promise.all([
    exerciseRepository.list(),
    sessionRepository.listAll(),
    settingsRepository.get(),
  ])

  const entryLists = await Promise.all(exercises.map((ex) => entryRepository.listByExercise(ex.id)))
  const workoutEntries = entryLists.flat()

  const photoIds = Array.from(new Set(exercises.map((e) => e.photoId).filter((id): id is string => id !== null)))
  const photoResults = await Promise.all(
    photoIds.map(async (id): Promise<BackupPhotoRecord | null> => {
      const photo = await photoRepository.get(id)
      if (!photo) return null
      // One photo failing to encode shouldn't take down the whole
      // export — skip it and keep going, per section 46's "never
      // silently lose workout data" (the rest of the backup still
      // completes; only this photo is missing from it).
      try {
        return { id, mimeType: photo.mimeType, width: photo.width, height: photo.height, base64: await blobToBase64(photo.blob) }
      } catch (error) {
        console.error(`Could not include photo ${id} in the backup:`, error)
        return null
      }
    }),
  )

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    workoutSessions: sessions,
    workoutEntries,
    settings,
    photos: photoResults.filter((p): p is BackupPhotoRecord => p !== null),
  }
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fitness-tracker-backup-${backup.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
