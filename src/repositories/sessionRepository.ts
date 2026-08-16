import { getDB } from '../db'
import type { WorkoutSession } from '../types'
import { createId } from './ids'

export type NewSession = Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'>

export const sessionRepository = {
  async listAll(): Promise<WorkoutSession[]> {
    const db = await getDB()
    return db.getAll('workoutSessions')
  },

  async listByDate(date: string): Promise<WorkoutSession[]> {
    const db = await getDB()
    return db.getAllFromIndex('workoutSessions', 'by-date', date)
  },

  /** Inclusive range over YYYY-MM-DD strings — ISO date strings sort
   *  lexicographically, so this works directly against the index. */
  async listByDateRange(startDate: string, endDate: string): Promise<WorkoutSession[]> {
    const db = await getDB()
    return db.getAllFromIndex('workoutSessions', 'by-date', IDBKeyRange.bound(startDate, endDate))
  },

  async get(id: string): Promise<WorkoutSession | undefined> {
    const db = await getDB()
    return db.get('workoutSessions', id)
  },

  async create(input: NewSession): Promise<WorkoutSession> {
    const db = await getDB()
    const now = Date.now()
    const session: WorkoutSession = { ...input, id: createId(), createdAt: now, updatedAt: now }
    await db.add('workoutSessions', session)
    return session
  },

  async update(id: string, patch: Partial<Omit<WorkoutSession, 'id' | 'createdAt'>>): Promise<WorkoutSession> {
    const db = await getDB()
    const existing = await db.get('workoutSessions', id)
    if (!existing) throw new Error(`Session ${id} not found`)
    const updated: WorkoutSession = { ...existing, ...patch, id, updatedAt: Date.now() }
    await db.put('workoutSessions', updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('workoutSessions', id)
  },

  /** Re-inserts a session exactly as it was (same id/timestamps) — used to
   *  restore from the trash store when a delete is undone. */
  async restoreDeleted(session: WorkoutSession): Promise<WorkoutSession> {
    const db = await getDB()
    await db.put('workoutSessions', session)
    return session
  },
}
