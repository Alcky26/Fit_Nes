import { entryRepository, exerciseRepository, photoRepository, sessionRepository, settingsRepository } from '../repositories'
import type { BackupData, BackupPhotoRecord } from './types'

/**
 * Converts a Blob to a base64 string for the JSON backup.
 *
 * Prefers Blob.arrayBuffer() — every real browser's Blob supports it, and
 * it's the simplest path there. Falls back to FileReader.readAsArrayBuffer
 * (the older, more universally-implemented way to read a Blob's bytes)
 * when arrayBuffer() isn't available at all, which is the case for this
 * project's jsdom test environment — confirmed on a freshly-constructed
 * Blob, not just one read back out of (fake-)IndexedDB, so this is a
 * jsdom completeness gap rather than anything specific to IndexedDB
 * round-tripping. A Blob reconstructed by fake-indexeddb's storage
 * emulation can still fail both paths (it isn't recognized as jsdom's
 * own Blob class by FileReader either) — buildBackup() below tolerates
 * that per-photo rather than this function trying to work around it.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof blob.arrayBuffer === 'function') {
    try {
      return encodeArrayBuffer(await blob.arrayBuffer())
    } catch {
      // Fall through to the FileReader path below.
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (!(result instanceof ArrayBuffer)) {
        reject(new Error('Unexpected FileReader result type'))
        return
      }
      resolve(encodeArrayBuffer(result))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read photo blob'))
    reader.readAsArrayBuffer(blob)
  })
}

/** Chunked to avoid a "Maximum call stack size exceeded" error from
 *  spreading a very large byte array into String.fromCharCode at once. */
function encodeArrayBuffer(buffer: ArrayBuffer): string {
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
