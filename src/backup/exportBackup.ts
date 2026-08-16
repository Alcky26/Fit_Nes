import { entryRepository, exerciseRepository, photoRepository, sessionRepository, settingsRepository } from '../repositories'
import type { BackupData, BackupPhotoRecord } from './types'

/** Chunked to avoid a "Maximum call stack size exceeded" error from
 *  spreading a very large byte array into String.fromCharCode at once. */
async function blobToBase64(blob: Blob): Promise<string> {
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
      return { id, mimeType: photo.mimeType, width: photo.width, height: photo.height, base64: await blobToBase64(photo.blob) }
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
