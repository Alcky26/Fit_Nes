import { describe, expect, it } from 'vitest'
import { validateBackup } from './validateBackup'

const VALID = {
  schemaVersion: 1 as const,
  exportedAt: '2026-08-01T00:00:00.000Z',
  exercises: [
    {
      id: 'ex1',
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      statDefs: [] as unknown[],
      usesSets: false,
      archived: false,
      createdAt: 0,
      updatedAt: 0,
    },
  ],
  workoutSessions: [] as unknown[],
  workoutEntries: [] as unknown[],
  photos: [] as unknown[],
  settings: null,
}

describe('validateBackup', () => {
  it('accepts a well-formed backup and returns an accurate summary', () => {
    const result = validateBackup(VALID)
    expect(result.valid).toBe(true)
    expect(result.summary).toEqual({ exerciseCount: 1, sessionCount: 0, entryCount: 0, photoCount: 0 })
    expect(result.data).not.toBeNull()
  })

  it('rejects non-object input instead of crashing', () => {
    expect(validateBackup('not an object').valid).toBe(false)
    expect(validateBackup(null).valid).toBe(false)
    expect(validateBackup([1, 2, 3]).valid).toBe(false)
    expect(validateBackup(undefined).valid).toBe(false)
  })

  it('rejects an unsupported schema version', () => {
    const result = validateBackup({ ...VALID, schemaVersion: 2 })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('schema version'))).toBe(true)
  })

  it('rejects an exercise missing a required field, naming the exact field', () => {
    const broken = {
      ...VALID,
      exercises: [
        {
          id: 'ex1',
          name: undefined,
          category: 'cardio',
          description: '',
          photoId: null,
          statDefs: [] as unknown[],
          usesSets: false,
          archived: false,
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    }
    const result = validateBackup(broken)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('exercises[0].name: missing or invalid')
  })

  it('rejects a top-level field with the wrong type instead of crashing on it', () => {
    const broken = { ...VALID, exercises: 'not an array' }
    const result = validateBackup(broken)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('exercises: expected an array')
  })

  it('does not throw when workoutEntries contains a raw non-object value', () => {
    const broken = { ...VALID, workoutEntries: [null, 'garbage', 42] }
    expect(() => validateBackup(broken)).not.toThrow()
    expect(validateBackup(broken).valid).toBe(false)
  })
})
