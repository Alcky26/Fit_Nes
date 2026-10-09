import { beforeEach, describe, expect, it } from 'vitest'
import { getDB } from '../db'
import { buildBackup } from '../backup/exportBackup'
import { importBackup } from '../backup/importBackup'
import { validateBackup } from '../backup/validateBackup'
import { computeExerciseRecords } from '../analytics/personalRecords'
import { loadExerciseReference } from '../analytics/exerciseReference'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { resetDatabase } from '../test/resetDatabase'
import { formatExerciseTargets } from '../utils/format'

beforeEach(async () => {
  await resetDatabase()
})

/** An exercise exactly as the first release stored it: no targetReps, no
 *  restSeconds. Written straight to IndexedDB, bypassing the repository. */
const LEGACY_EXERCISE = {
  id: 'legacy-ex',
  name: 'Chest Press',
  category: 'chest',
  description: '',
  photoId: null,
  statDefs: [
    { id: 'reps', type: 'reps', label: 'Repetitions', unit: null, direction: 'higherIsBetter', isText: false },
    { id: 'weight', type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter', isText: false },
  ],
  usesSets: true,
  archived: false,
  createdAt: 1,
  updatedAt: 1,
} as const

async function seedLegacyData() {
  const db = await getDB()
  await db.put('exercises', structuredClone(LEGACY_EXERCISE) as never)
  const session = await sessionRepository.create({ date: '2026-09-01', startTime: null, endTime: null, title: 'W', notes: '' })
  await entryRepository.create({
    sessionId: session.id,
    exerciseId: LEGACY_EXERCISE.id,
    date: '2026-09-01',
    notes: 'felt heavy',
    sets: [
      { setNumber: 1, values: { reps: 15, weight: 29 } },
      { setNumber: 2, values: { reps: 10, weight: 36 } },
    ],
  })
}

describe('data saved by the first release', () => {
  it('loads without the new fields and reports no targets', async () => {
    await seedLegacyData()
    const exercise = await exerciseRepository.get(LEGACY_EXERCISE.id)
    expect(exercise).toBeDefined()
    expect(exercise?.targetReps ?? null).toBeNull()
    expect(exercise?.restSeconds ?? null).toBeNull()
    expect(formatExerciseTargets(exercise!)).toBeNull()
  })

  it('can be edited to add targets without losing anything else', async () => {
    await seedLegacyData()
    const updated = await exerciseRepository.update(LEGACY_EXERCISE.id, { targetReps: '8-12', restSeconds: 90 })
    expect(updated.targetReps).toBe('8-12')
    expect(updated.restSeconds).toBe(90)
    expect(updated.statDefs).toHaveLength(2)
    expect(updated.name).toBe('Chest Press')
    expect(formatExerciseTargets(updated)).toBe('Target 8-12 reps · Rest 1 min 30 s')
  })

  it('still produces records and the last-time reference', async () => {
    await seedLegacyData()
    const exercise = (await exerciseRepository.get(LEGACY_EXERCISE.id))!
    const records = await computeExerciseRecords(exercise)
    expect(records.statRecords.find((r) => r.statId === 'weight')?.best.value).toBe(36)

    const reference = await loadExerciseReference(exercise, '2026-09-10')
    expect(reference.lastEntry?.sets).toHaveLength(2)
    expect(reference.recentNote?.text).toBe('felt heavy')
  })

  it('exports, validates and re-imports with the new fields intact', async () => {
    await seedLegacyData()
    await exerciseRepository.update(LEGACY_EXERCISE.id, { targetReps: '10', restSeconds: 60 })
    const backup = JSON.parse(JSON.stringify(await buildBackup()))
    expect(validateBackup(backup).valid).toBe(true)

    await resetDatabase()
    await importBackup(backup, 'replace')
    const restored = await exerciseRepository.get(LEGACY_EXERCISE.id)
    expect(restored?.targetReps).toBe('10')
    expect(restored?.restSeconds).toBe(60)
  })

  it('accepts an old backup file whose exercises lack the new fields', async () => {
    const oldBackup = {
      schemaVersion: 1,
      exportedAt: '2026-09-01T10:00:00.000Z',
      exercises: [structuredClone(LEGACY_EXERCISE)],
      workoutSessions: [],
      workoutEntries: [],
      settings: null,
      photos: [],
    }
    const result = validateBackup(oldBackup)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)

    await importBackup(JSON.parse(JSON.stringify(oldBackup)), 'replace')
    expect((await exerciseRepository.get(LEGACY_EXERCISE.id))?.name).toBe('Chest Press')
  })

  it('rejects malformed new fields', () => {
    const bad = {
      schemaVersion: 1,
      exportedAt: 'x',
      exercises: [{ ...LEGACY_EXERCISE, targetReps: 12, restSeconds: 'soon' }],
      workoutSessions: [],
      workoutEntries: [],
      settings: null,
      photos: [],
    }
    const result = validateBackup(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('targetReps')
    expect(result.errors.join(' ')).toContain('restSeconds')
  })
})
