import { beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDBConnection } from '../db'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import type { Exercise } from '../types'
import { computeExerciseRecords, computeImprovementPercent, recordsInRange, recordsSetByEntry } from './personalRecords'

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

async function createSeatedRow(): Promise<Exercise> {
  return exerciseRepository.create({
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
}

describe('computeExerciseRecords', () => {
  it('tracks the running best for a higher-is-better stat and what it was before', async () => {
    const exercise = await createSeatedRow()
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })

    const first = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 30 } }],
    })
    const second = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-08',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 35 } }],
    })
    const third = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-15',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 40 } }],
    })

    const records = await computeExerciseRecords(exercise)
    const weight = records.statRecords.find((r) => r.statId === 'weight')

    expect(weight?.best).toMatchObject({ entryId: third.id, value: 40 })
    expect(weight?.previousBest).toMatchObject({ entryId: second.id, value: 35 })

    // The first entry never held the standing record after the second
    // beat it, so recordsSetByEntry should only attribute a record to
    // entries that actually improved on the prior best.
    expect(recordsSetByEntry(records, first.id)).toHaveLength(0)
    expect(recordsSetByEntry(records, third.id).map((r) => r.statId)).toContain('weight')
  })

  it('a tie does not overwrite the standing record or its previousBest', async () => {
    const exercise = await createSeatedRow()
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 40 } }],
    })
    const tie = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-08',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 40 } }],
    })

    const records = await computeExerciseRecords(exercise)
    const weight = records.statRecords.find((r) => r.statId === 'weight')

    expect(weight?.best.value).toBe(40)
    expect(weight?.previousBest).toBeNull()
    expect(recordsSetByEntry(records, tie.id)).toHaveLength(0)
  })

  it('computes a training-volume record (weight × reps) only when both stats exist', async () => {
    const exercise = await createSeatedRow()
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    const entry = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [
        { setNumber: 1, values: { reps: 12, weight: 30 } },
        { setNumber: 2, values: { reps: 10, weight: 35 } },
        { setNumber: 3, values: { reps: 8, weight: 40 } },
      ],
    })

    const records = await computeExerciseRecords(exercise)
    // Best single-set volume: 8 x 40 = 320, not the sum across sets.
    expect(records.volumeRecord).toMatchObject({ statId: 'volume', unit: 'kg', best: { entryId: entry.id, value: 320 } })
  })

  it('returns null volumeRecord and skips neutral/text stats for an exercise without both weight and reps', async () => {
    const treadmill = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [
        { id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false },
        { id: 'hr', type: 'heartRate', label: 'Heart Rate', unit: 'bpm', direction: 'neutral', isText: false },
        { id: 'cue', type: 'customText', label: 'Form cue', unit: null, direction: 'neutral', isText: true },
      ],
    })
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: treadmill.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 20, hr: 140, cue: 'upright posture' } }],
    })

    const records = await computeExerciseRecords(treadmill)
    expect(records.volumeRecord).toBeNull()
    expect(records.statRecords.map((r) => r.statId)).toEqual(['duration'])
  })

  it('tracks a lower-is-better stat as a minimum', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Sprint',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'time', type: 'customNumeric', label: 'Time', unit: 'sec', direction: 'lowerIsBetter', isText: false }],
    })
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { time: 60 } }],
    })
    const faster = await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-08',
      notes: '',
      sets: [{ setNumber: 1, values: { time: 55 } }],
    })

    const records = await computeExerciseRecords(exercise)
    expect(records.statRecords[0]).toMatchObject({ best: { entryId: faster.id, value: 55 }, previousBest: { value: 60 } })
  })
})

describe('recordsInRange', () => {
  it('includes only records whose current best falls within the range', async () => {
    const exercise = await createSeatedRow()
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 30 } }],
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-20',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 40 } }],
    })

    const records = await computeExerciseRecords(exercise)
    expect(recordsInRange(records, { start: '2026-08-01', end: '2026-08-10' })).toHaveLength(0)
    expect(recordsInRange(records, { start: '2026-08-15', end: '2026-08-31' }).map((r) => r.statId)).toContain('weight')
  })
})

describe('computeImprovementPercent', () => {
  it('is positive for a higher-is-better increase', () => {
    expect(computeImprovementPercent(40, 30, 'higherIsBetter')).toBeCloseTo(33.33, 1)
  })

  it('is positive for a lower-is-better decrease (a faster time)', () => {
    expect(computeImprovementPercent(8, 10, 'lowerIsBetter')).toBeCloseTo(20, 1)
  })

  it('is negative for a lower-is-better increase (a slower time)', () => {
    expect(computeImprovementPercent(12, 10, 'lowerIsBetter')).toBeCloseTo(-20, 1)
  })

  it('returns null for a neutral stat', () => {
    expect(computeImprovementPercent(140, 130, 'neutral')).toBeNull()
  })

  it('returns null instead of dividing by zero when the previous value is 0', () => {
    expect(computeImprovementPercent(10, 0, 'higherIsBetter')).toBeNull()
  })
})
