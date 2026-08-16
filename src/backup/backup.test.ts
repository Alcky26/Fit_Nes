import { beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDBConnection } from '../db'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { photoRepository } from '../repositories/photoRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { settingsRepository } from '../repositories/settingsRepository'
import { buildBackup } from './exportBackup'
import { importBackup } from './importBackup'
import { validateBackup } from './validateBackup'

async function resetDatabase() {
  resetDBConnection()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  await resetDatabase()
})

describe('backup export/import round trip', () => {
  it('restores exercises, sessions, entries, settings, and a photo Blob after a full export -> JSON -> import cycle', async () => {
    const photo = await photoRepository.save({
      blob: new Blob(['fake-image-bytes'], { type: 'image/webp' }),
      mimeType: 'image/webp',
      width: 800,
      height: 600,
    })
    const exercise = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: 'Incline walk',
      photoId: photo.id,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })
    const session = await sessionRepository.create({
      date: '2026-08-01',
      startTime: '18:00',
      endTime: '18:30',
      title: 'Evening Cardio',
      notes: 'Felt good',
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 20 } }],
    })
    await settingsRepository.update({ theme: 'dark' })

    const backup = await buildBackup()
    expect(backup.exercises).toHaveLength(1)
    expect(backup.photos).toHaveLength(1)

    // Round-trip through JSON.stringify/parse — exactly what happens
    // between "Export" writing a file and "Import" reading it back.
    const roundTripped: unknown = JSON.parse(JSON.stringify(backup))
    const validation = validateBackup(roundTripped)
    expect(validation.valid).toBe(true)
    expect(validation.summary).toEqual({ exerciseCount: 1, sessionCount: 1, entryCount: 1, photoCount: 1 })
    if (!validation.data) throw new Error('expected validation.data to be present')

    await resetDatabase()

    const result = await importBackup(validation.data, 'replace')
    expect(result).toEqual({ exercisesImported: 1, sessionsImported: 1, entriesImported: 1, photosImported: 1 })

    const restoredExercise = await exerciseRepository.get(exercise.id)
    expect(restoredExercise?.name).toBe('Treadmill')
    expect(restoredExercise?.photoId).toBe(photo.id)

    const restoredPhoto = await photoRepository.get(photo.id)
    expect(restoredPhoto?.mimeType).toBe('image/webp')
    expect(await restoredPhoto?.blob.text()).toBe('fake-image-bytes')

    const restoredSettings = await settingsRepository.get()
    expect(restoredSettings.theme).toBe('dark')

    const restoredEntries = await entryRepository.listByExercise(exercise.id)
    expect(restoredEntries).toHaveLength(1)
    expect(restoredEntries[0]?.sets).toEqual([{ setNumber: 1, values: { duration: 20 } }])
  })

  it('merge mode overwrites a matching id in place instead of duplicating it, and leaves other data untouched', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Squat',
      category: 'legs',
      description: '',
      photoId: null,
      usesSets: true,
      statDefs: [{ id: 'weight', type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter', isText: false }],
    })
    const untouched = await exerciseRepository.create({
      name: 'Plank',
      category: 'core',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })

    const backup = await buildBackup()
    // Simulate importing a backup where this exercise's name was edited
    // since the export — same id, different content.
    const edited = { ...backup, exercises: backup.exercises.map((e) => (e.id === exercise.id ? { ...e, name: 'Back Squat' } : e)) }

    const result = await importBackup(edited, 'merge')
    expect(result.exercisesImported).toBe(2)

    const all = await exerciseRepository.list()
    expect(all).toHaveLength(2) // no duplicate created
    expect(all.find((e) => e.id === exercise.id)?.name).toBe('Back Squat')
    expect(all.find((e) => e.id === untouched.id)?.name).toBe('Plank')
  })
})
