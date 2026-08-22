import { beforeEach, describe, expect, it, vi } from 'vitest'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { photoRepository } from '../repositories/photoRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { settingsRepository } from '../repositories/settingsRepository'
import { resetDatabase } from '../test/resetDatabase'
import { blobToBase64, buildBackup } from './exportBackup'
import { base64ToBlob, importBackup } from './importBackup'
import { validateBackup } from './validateBackup'

beforeEach(async () => {
  await resetDatabase()
})

describe('blobToBase64 + base64ToBlob', () => {
  // Exercised directly against a freshly-constructed Blob rather than one
  // fetched back out of IndexedDB — see the comment on blobToBase64 in
  // exportBackup.ts for why a round-tripped Blob is a jsdom+fake-indexeddb
  // test-tooling limitation, not something to route around here.
  it('round-trips arbitrary bytes through base64 encoding and decoding losslessly', async () => {
    const original = new Blob(['fake-image-bytes'], { type: 'image/webp' })

    const base64 = await blobToBase64(original)
    const decoded = base64ToBlob(base64, 'image/webp')

    expect(decoded.type).toBe('image/webp')
    expect(decoded.size).toBe(original.size)
    expect(await decoded.text()).toBe('fake-image-bytes')
  })
})

describe('backup export/import round trip', () => {
  it('restores exercises, sessions, entries, and settings after a full export -> JSON -> import cycle', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: 'Incline walk',
      photoId: null,
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

    // Round-trip through JSON.stringify/parse — exactly what happens
    // between "Export" writing a file and "Import" reading it back.
    const roundTripped: unknown = JSON.parse(JSON.stringify(backup))
    const validation = validateBackup(roundTripped)
    expect(validation.valid).toBe(true)
    expect(validation.summary).toEqual({ exerciseCount: 1, sessionCount: 1, entryCount: 1, photoCount: 0 })
    if (!validation.data) throw new Error('expected validation.data to be present')

    await resetDatabase()

    const result = await importBackup(validation.data, 'replace')
    expect(result).toEqual({ exercisesImported: 1, sessionsImported: 1, entriesImported: 1, photosImported: 0 })

    const restoredExercise = await exerciseRepository.get(exercise.id)
    expect(restoredExercise?.name).toBe('Treadmill')

    const restoredSettings = await settingsRepository.get()
    expect(restoredSettings.theme).toBe('dark')

    const restoredEntries = await entryRepository.listByExercise(exercise.id)
    expect(restoredEntries).toHaveLength(1)
    expect(restoredEntries[0]?.sets).toEqual([{ setNumber: 1, values: { duration: 20 } }])
  })

  it('does not crash the whole export if one stored photo cannot be encoded', async () => {
    // If this environment can't actually encode the photo (see the
    // comment on blobToBase64), buildBackup() logs it via console.error
    // per photo rather than throwing — silence that expected output for
    // a clean test log.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const photo = await photoRepository.save({
      blob: new Blob(['fake-image-bytes'], { type: 'image/webp' }),
      mimeType: 'image/webp',
      width: 800,
      height: 600,
    })
    await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: photo.id,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })

    // Whether or not this specific test environment can actually encode
    // the photo, the rest of the backup must still come through intact
    // rather than the whole export throwing.
    const backup = await buildBackup()
    expect(backup.exercises).toHaveLength(1)
    expect(backup.exercises[0]?.name).toBe('Treadmill')
    expect(backup.photos.length).toBeLessThanOrEqual(1)

    consoleSpy.mockRestore()
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
