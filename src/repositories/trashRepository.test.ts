import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from '../db'
import { resetDatabase } from '../test/resetDatabase'
import { entryRepository } from './entryRepository'
import { exerciseRepository } from './exerciseRepository'
import { sessionRepository } from './sessionRepository'
import { trashRepository } from './trashRepository'

beforeEach(async () => {
  await resetDatabase()
})

describe('delete + undo flow', () => {
  it('restores an exercise deleted with zero history exactly as it was', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Plank',
      category: 'core',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })

    await trashRepository.put('exercise', exercise)
    await exerciseRepository.hardDelete(exercise.id)
    expect(await exerciseRepository.get(exercise.id)).toBeUndefined()

    await exerciseRepository.restoreDeleted(exercise)
    expect(await exerciseRepository.get(exercise.id)).toEqual(exercise)
  })

  it('restores a deleted entry exactly as it was, including its sets', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Seated Row',
      category: 'back',
      description: '',
      photoId: null,
      usesSets: true,
      statDefs: [
        { id: 'reps', type: 'reps', label: 'Repetitions', unit: null, direction: 'higherIsBetter', isText: false },
        { id: 'weight', type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter', isText: false },
      ],
    })
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    const entry = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: 'good set',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 40 } }],
    })

    await trashRepository.put('entry', entry)
    await entryRepository.delete(entry.id)
    expect(await entryRepository.get(entry.id)).toBeUndefined()

    await entryRepository.restoreDeleted(entry)
    expect(await entryRepository.get(entry.id)).toEqual(entry)
  })

  it('restores a deleted workout and its entries together (the "delete workout" flow)', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'Cardio', notes: 'note' })
    const entry = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 20 } }],
    })

    await trashRepository.put('session', { session, entries: [entry] })
    await entryRepository.delete(entry.id)
    await sessionRepository.delete(session.id)
    expect(await sessionRepository.get(session.id)).toBeUndefined()
    expect(await entryRepository.get(entry.id)).toBeUndefined()

    await sessionRepository.restoreDeleted(session)
    await entryRepository.restoreDeleted(entry)

    expect(await sessionRepository.get(session.id)).toEqual(session)
    expect(await entryRepository.get(entry.id)).toEqual(entry)
  })

  it('clearExpired sweeps only entries past their expiry, leaving fresh ones recoverable', async () => {
    const expired = await trashRepository.put('exercise', { note: 'old' })
    const db = await getDB()
    await db.put('trash', { ...expired, expiresAt: Date.now() - 1000 })

    const fresh = await trashRepository.put('exercise', { note: 'new' })

    await trashRepository.clearExpired()

    expect(await trashRepository.get(expired.id)).toBeUndefined()
    expect(await trashRepository.get(fresh.id)).toBeDefined()
  })
})
