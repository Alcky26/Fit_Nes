import { beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME, resetDBConnection } from '../db'
import { entryRepository } from './entryRepository'
import { sessionRepository } from './sessionRepository'

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

describe('sessionRepository + entryRepository', () => {
  it('links a multi-set entry to its session and queries it back by session, exercise, and date range', async () => {
    const session = await sessionRepository.create({
      date: '2026-08-12',
      startTime: '18:00',
      endTime: '18:45',
      title: 'Upper Body',
      notes: 'Felt strong today.',
    })

    const entry = await entryRepository.create({
      sessionId: session.id,
      exerciseId: 'ex-seated-row',
      date: session.date,
      notes: '',
      sets: [
        { setNumber: 1, values: { reps: 12, weight: 30 } },
        { setNumber: 2, values: { reps: 10, weight: 35 } },
        { setNumber: 3, values: { reps: 8, weight: 40 } },
      ],
    })

    const bySession = await entryRepository.listBySession(session.id)
    expect(bySession).toHaveLength(1)
    const [savedEntry] = bySession
    expect(savedEntry?.id).toBe(entry.id)
    expect(savedEntry?.sets).toHaveLength(3)
    expect(savedEntry?.sets[2]?.values.weight).toBe(40)

    const byExercise = await entryRepository.listByExercise('ex-seated-row')
    expect(byExercise).toHaveLength(1)

    const byDate = await entryRepository.listByDateRange('2026-08-01', '2026-08-31')
    expect(byDate.map((e) => e.id)).toEqual([entry.id])

    const outsideRange = await entryRepository.listByDateRange('2026-09-01', '2026-09-30')
    expect(outsideRange).toHaveLength(0)

    const sessionsOnDate = await sessionRepository.listByDate('2026-08-12')
    expect(sessionsOnDate.map((s) => s.id)).toEqual([session.id])
  })

  it('keeps entries queryable by session after the session itself is edited', async () => {
    const session = await sessionRepository.create({
      date: '2026-08-12',
      startTime: null,
      endTime: null,
      title: 'Leg Day',
      notes: '',
    })
    await entryRepository.create({
      sessionId: session.id,
      exerciseId: 'ex-leg-press',
      date: session.date,
      notes: '',
      sets: [{ setNumber: 1, values: { reps: 10, weight: 80 } }],
    })

    await sessionRepository.update(session.id, { title: 'Leg Day (heavy)' })

    const entries = await entryRepository.listBySession(session.id)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.sessionId).toBe(session.id)
  })

  it('a single-value cardio entry stores one set with mixed numeric values', async () => {
    const session = await sessionRepository.create({
      date: '2026-08-12',
      startTime: null,
      endTime: null,
      title: 'Cardio',
      notes: '',
    })
    const entry = await entryRepository.create({
      sessionId: session.id,
      exerciseId: 'ex-treadmill',
      date: session.date,
      notes: '',
      sets: [{ setNumber: 1, values: { duration: 10, speed: 6, incline: 5 } }],
    })

    const fetched = await entryRepository.get(entry.id)
    expect(fetched?.sets).toHaveLength(1)
    expect(fetched?.sets[0]?.values).toEqual({ duration: 10, speed: 6, incline: 5 })
  })
})
