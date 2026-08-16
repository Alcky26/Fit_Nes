import { beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDBConnection } from '../db'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import type { Exercise } from '../types'
import { getDailySummary } from './dailySummary'

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

async function makeExercisesById(...exercises: Exercise[]): Promise<Map<string, Exercise>> {
  return new Map(exercises.map((e) => [e.id, e]))
}

describe('getDailySummary', () => {
  it('returns zeroed totals and no duration entries for a day with nothing logged', async () => {
    const summary = await getDailySummary('2026-08-12', new Map())
    expect(summary).toMatchObject({ exerciseCount: 0, setCount: 0, durationTotals: [] })
    expect(summary.sessions).toHaveLength(0)
    expect(summary.entries).toHaveLength(0)
  })

  it('counts distinct exercises and total sets across a mixed strength+cardio day', async () => {
    const seatedRow = await exerciseRepository.create({
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
    const treadmill = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })

    const session = await sessionRepository.create({
      date: '2026-08-12',
      startTime: null,
      endTime: null,
      title: 'Workout',
      notes: '',
    })

    await entryRepository.create({
      sessionId: session.id,
      exerciseId: seatedRow.id,
      date: '2026-08-12',
      notes: '',
      sets: [
        { setNumber: 1, values: { reps: 12, weight: 30 } },
        { setNumber: 2, values: { reps: 10, weight: 35 } },
        { setNumber: 3, values: { reps: 8, weight: 40 } },
      ],
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: treadmill.id,
      date: '2026-08-12',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 20 } }],
    })

    const exercisesById = await makeExercisesById(seatedRow, treadmill)
    const summary = await getDailySummary('2026-08-12', exercisesById)

    expect(summary.exerciseCount).toBe(2)
    expect(summary.setCount).toBe(4)
    expect(summary.durationTotals).toEqual([{ unit: 'min', total: 20 }])
  })

  it('sums durations per unit instead of blending different units together', async () => {
    const treadmill = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })
    const plank = await exerciseRepository.create({
      name: 'Plank',
      category: 'core',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'hold', type: 'duration', label: 'Hold Time', unit: 'sec', direction: 'higherIsBetter', isText: false }],
    })

    const session = await sessionRepository.create({
      date: '2026-08-12',
      startTime: null,
      endTime: null,
      title: 'Workout',
      notes: '',
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: treadmill.id,
      date: '2026-08-12',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 15 } }],
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: plank.id,
      date: '2026-08-12',
      notes: '',
      sets: [{ setNumber: 1, values: { hold: 90 } }],
    })

    const exercisesById = await makeExercisesById(treadmill, plank)
    const summary = await getDailySummary('2026-08-12', exercisesById)

    expect(summary.durationTotals.sort((a, b) => a.unit.localeCompare(b.unit))).toEqual([
      { unit: 'min', total: 15 },
      { unit: 'sec', total: 90 },
    ])
  })

  it('only includes entries dated on the requested day', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })
    const session = await sessionRepository.create({
      date: '2026-08-11',
      startTime: null,
      endTime: null,
      title: 'Workout',
      notes: '',
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-11',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 20 } }],
    })

    const exercisesById = await makeExercisesById(exercise)
    const summary = await getDailySummary('2026-08-12', exercisesById)

    expect(summary.exerciseCount).toBe(0)
    expect(summary.entries).toHaveLength(0)
  })
})
