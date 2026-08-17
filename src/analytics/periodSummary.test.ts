import { beforeEach, describe, expect, it } from 'vitest'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { resetDatabase } from '../test/resetDatabase'
import type { Exercise } from '../types'
import { aggregateByMonth, getPeriodSummary } from './periodSummary'

beforeEach(async () => {
  await resetDatabase()
})

describe('getPeriodSummary', () => {
  it('counts distinct training days separately from total workouts, and zero-fills the daily breakdown', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })

    // Two separate sessions on the same day — one training day, two workouts.
    const sessionA = await sessionRepository.create({ date: '2026-08-10', startTime: null, endTime: null, title: 'AM', notes: '' })
    const sessionB = await sessionRepository.create({ date: '2026-08-10', startTime: null, endTime: null, title: 'PM', notes: '' })
    await entryRepository.create({
      sessionId: sessionA.id,
      exerciseId: exercise.id,
      date: '2026-08-10',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 10 } }],
    })
    await entryRepository.create({
      sessionId: sessionB.id,
      exerciseId: exercise.id,
      date: '2026-08-10',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 15 } }],
    })

    const exercisesById = new Map<string, Exercise>([[exercise.id, exercise]])
    const summary = await getPeriodSummary({ start: '2026-08-10', end: '2026-08-12' }, exercisesById)

    expect(summary.trainingDays).toBe(1)
    expect(summary.sessionCount).toBe(2)
    expect(summary.durationTotals).toEqual([{ unit: 'min', total: 25 }])

    // Three-day range, zero-filled for the two days with nothing logged.
    expect(summary.dailyBreakdown).toEqual([
      { date: '2026-08-10', setCount: 2, sessionCount: 2 },
      { date: '2026-08-11', setCount: 0, sessionCount: 0 },
      { date: '2026-08-12', setCount: 0, sessionCount: 0 },
    ])
  })

  it('ranks exercise frequency by entry count, most-trained first', async () => {
    const squat = await exerciseRepository.create({
      name: 'Squat',
      category: 'legs',
      description: '',
      photoId: null,
      usesSets: true,
      statDefs: [{ id: 'weight', type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter', isText: false }],
    })
    const plank = await exerciseRepository.create({
      name: 'Plank',
      category: 'core',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })
    const session = await sessionRepository.create({ date: '2026-08-10', startTime: null, endTime: null, title: 'Workout', notes: '' })

    for (const date of ['2026-08-10', '2026-08-11', '2026-08-12']) {
      await entryRepository.create({
        sessionId: session.id,
        exerciseId: squat.id,
        date,
        notes: '',
        sets: [{ setNumber: 1, values: { weight: 60 } }],
      })
    }
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: plank.id,
      date: '2026-08-10',
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 2 } }],
    })

    const exercisesById = new Map<string, Exercise>([
      [squat.id, squat],
      [plank.id, plank],
    ])
    const summary = await getPeriodSummary({ start: '2026-08-10', end: '2026-08-12' }, exercisesById)

    expect(summary.exerciseFrequency).toEqual([
      { exerciseId: squat.id, exerciseName: 'Squat', entryCount: 3 },
      { exerciseId: plank.id, exerciseName: 'Plank', entryCount: 1 },
    ])
  })
})

describe('aggregateByMonth', () => {
  it('rolls daily points up into one total per calendar month, sorted chronologically', () => {
    const result = aggregateByMonth([
      { date: '2026-01-30', setCount: 3, sessionCount: 1 },
      { date: '2026-01-31', setCount: 2, sessionCount: 1 },
      { date: '2026-02-01', setCount: 5, sessionCount: 1 },
    ])

    expect(result).toEqual([
      { month: '2026-01', setCount: 5, sessionCount: 2 },
      { month: '2026-02', setCount: 5, sessionCount: 1 },
    ])
  })

  it('returns an empty array for an empty input', () => {
    expect(aggregateByMonth([])).toEqual([])
  })
})
