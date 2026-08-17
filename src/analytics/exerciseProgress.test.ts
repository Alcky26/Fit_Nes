import { beforeEach, describe, expect, it } from 'vitest'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { resetDatabase } from '../test/resetDatabase'
import type { Exercise } from '../types'
import { computeExerciseProgress, computeProgressComparison } from './exerciseProgress'

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

async function logEntry(exerciseId: string, date: string, weight: number, reps: number) {
  const session = await sessionRepository.create({ date, startTime: null, endTime: null, title: 'W', notes: '' })
  return entryRepository.create({
    sessionId: session.id,
    exerciseId,
    date,
    notes: '',
    sets: [{ setNumber: 1, values: { weight, reps } }],
  })
}

describe('computeExerciseProgress', () => {
  it('computes best/average/total for a custom range from the underlying sets', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-08-01', 30, 10)
    await logEntry(exercise.id, '2026-08-05', 35, 10)
    await logEntry(exercise.id, '2026-08-10', 40, 10)

    const progress = await computeExerciseProgress(exercise, { kind: 'custom', range: { start: '2026-08-01', end: '2026-08-10' } })
    const weight = progress.stats.find((s) => s.statId === 'weight')

    expect(progress.sessionCount).toBe(3)
    expect(progress.trainingDays).toBe(3)
    expect(weight?.best).toBe(40)
    expect(weight?.average).toBeCloseTo(35, 5)
    expect(weight?.total).toBe(105)
  })

  it('excludes entries outside the selected range', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-07-01', 20, 10)
    await logEntry(exercise.id, '2026-08-05', 40, 10)

    const progress = await computeExerciseProgress(exercise, { kind: 'custom', range: { start: '2026-08-01', end: '2026-08-31' } })
    expect(progress.sessionCount).toBe(1)
    expect(progress.stats.find((s) => s.statId === 'weight')?.best).toBe(40)
  })

  it('all-time includes every entry regardless of date and has a null range', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2020-01-01', 20, 10)
    await logEntry(exercise.id, '2026-08-05', 40, 10)

    const progress = await computeExerciseProgress(exercise, { kind: 'allTime' })
    expect(progress.range).toBeNull()
    expect(progress.sessionCount).toBe(2)
    expect(progress.perWeekFrequency).toBeNull()
  })

  it('returns no stats and no volume for a period with nothing logged, rather than fabricating zeros', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-08-01', 30, 10)

    const progress = await computeExerciseProgress(exercise, { kind: 'custom', range: { start: '2026-09-01', end: '2026-09-30' } })
    expect(progress.sessionCount).toBe(0)
    expect(progress.stats).toEqual([])
    expect(progress.volume).toBeNull()
  })

  it('charts a short range at daily granularity, one label per calendar day', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-08-01', 30, 10)
    await logEntry(exercise.id, '2026-08-03', 35, 10)

    const progress = await computeExerciseProgress(exercise, { kind: 'custom', range: { start: '2026-08-01', end: '2026-08-07' } })
    const weight = progress.stats.find((s) => s.statId === 'weight')
    expect(weight?.chartPoints).toHaveLength(2)
  })

  it('rolls a long range up to monthly chart points without discarding the underlying best/average/total', async () => {
    const exercise = await createSeatedRow()
    // ~14 months apart, well past the 200-day weekly threshold.
    await logEntry(exercise.id, '2025-01-05', 30, 10)
    await logEntry(exercise.id, '2025-01-20', 32, 10)
    await logEntry(exercise.id, '2026-03-10', 40, 10)

    const progress = await computeExerciseProgress(exercise, { kind: 'custom', range: { start: '2025-01-01', end: '2026-03-31' } })
    const weight = progress.stats.find((s) => s.statId === 'weight')

    // Two January-2025 entries roll into one monthly chart point...
    expect(weight?.chartPoints).toHaveLength(2)
    // ...but the underlying total/best still reflect all three entries.
    expect(weight?.best).toBe(40)
    expect(weight?.total).toBe(102)
  })

  it('computes training volume as the best single set (weight × reps), not summed across sets', async () => {
    const exercise = await createSeatedRow()
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'W', notes: '' })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [
        { setNumber: 1, values: { reps: 12, weight: 30 } },
        { setNumber: 2, values: { reps: 8, weight: 40 } },
      ],
    })

    const progress = await computeExerciseProgress(exercise, { kind: 'allTime' })
    // 12 x 30 = 360, 8 x 40 = 320 — the best (highest) single-set volume
    // is 360, even though the second set has the higher weight alone.
    expect(progress.volume?.best).toBe(360)
  })
})

describe('computeProgressComparison', () => {
  it('computes an improvement percent against the immediately preceding equal-length period', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-07-15', 35, 10) // previous 30-day window
    await logEntry(exercise.id, '2026-08-10', 40, 10) // current 30-day window

    const { comparisons } = await computeProgressComparison(exercise, {
      kind: 'custom',
      range: { start: '2026-07-27', end: '2026-08-25' }, // 30 days; previous = 2026-06-27..2026-07-26
    })
    const weight = comparisons.find((c) => c.statId === 'weight')
    expect(weight?.currentBest).toBe(40)
    expect(weight?.previousBest).toBe(35)
    expect(weight?.improvementPercent).toBeCloseTo(((40 - 35) / 35) * 100, 5)
  })

  it('reports a null previousBest (not a fabricated comparison) when the previous period has no data', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-08-10', 40, 10)

    const { previous, comparisons } = await computeProgressComparison(exercise, {
      kind: 'custom',
      range: { start: '2026-08-01', end: '2026-08-15' },
    })
    expect(previous?.sessionCount).toBe(0)
    const weight = comparisons.find((c) => c.statId === 'weight')
    expect(weight?.previousBest).toBeNull()
    expect(weight?.improvementPercent).toBeNull()
  })

  it('all time has no previous period and no comparisons', async () => {
    const exercise = await createSeatedRow()
    await logEntry(exercise.id, '2026-08-10', 40, 10)

    const { previous, comparisons } = await computeProgressComparison(exercise, { kind: 'allTime' })
    expect(previous).toBeNull()
    expect(comparisons).toEqual([])
  })
})
