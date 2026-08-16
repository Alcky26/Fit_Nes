import { beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDBConnection } from '../db'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { buildHistoryCsv } from './exportCsv'

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

describe('buildHistoryCsv', () => {
  it('writes one row per metric per set, with the header first', async () => {
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
    const session = await sessionRepository.create({
      date: '2026-08-01',
      startTime: '18:00',
      endTime: null,
      title: 'Upper Body',
      notes: '',
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: 'Felt strong',
      sets: [
        { setNumber: 1, values: { reps: 12, weight: 30 } },
        { setNumber: 2, values: { reps: 10, weight: 35 } },
      ],
    })

    const csv = await buildHistoryCsv()
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe('Date,Time,Workout,Exercise,Category,Set,Metric,Value,Unit,Notes')
    // 2 sets x 2 metrics = 4 data rows, plus the header.
    expect(lines).toHaveLength(5)
    expect(lines[1]).toBe('2026-08-01,18:00,Upper Body,Seated Row,back,1,Repetitions,12,,Felt strong')
    expect(lines[2]).toBe('2026-08-01,18:00,Upper Body,Seated Row,back,1,Weight,30,kg,Felt strong')
    expect(lines[3]).toBe('2026-08-01,18:00,Upper Body,Seated Row,back,2,Repetitions,10,,Felt strong')
    expect(lines[4]).toBe('2026-08-01,18:00,Upper Body,Seated Row,back,2,Weight,35,kg,Felt strong')
  })

  it('escapes commas and quotes in notes per RFC 4180', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      usesSets: false,
      statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
    })
    const session = await sessionRepository.create({ date: '2026-08-01', startTime: null, endTime: null, title: 'Cardio', notes: '' })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: 'Good pace, felt "easy"',
      sets: [{ setNumber: 1, values: { duration: 20 } }],
    })

    const csv = await buildHistoryCsv()
    expect(csv).toContain('"Good pace, felt ""easy"""')
  })

  it('skips a stat with no recorded value rather than emitting a blank row', async () => {
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
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: exercise.id,
      date: '2026-08-01',
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 12 } }], // weight left blank
    })

    const csv = await buildHistoryCsv()
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(2) // header + one Repetitions row only
    expect(lines[1]).toContain('Repetitions,12')
  })
})
