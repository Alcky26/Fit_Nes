import { getDB } from '../db'
import type { WorkoutEntry } from '../types'
import { createId } from './ids'

export type NewEntry = Omit<WorkoutEntry, 'id' | 'createdAt' | 'updatedAt'>

export const entryRepository = {
  async listBySession(sessionId: string): Promise<WorkoutEntry[]> {
    const db = await getDB()
    return db.getAllFromIndex('workoutEntries', 'by-sessionId', sessionId)
  },

  /** Every recorded entry for one exercise — the query behind the
   *  exercise progress page and personal-record calculations. */
  async listByExercise(exerciseId: string): Promise<WorkoutEntry[]> {
    const db = await getDB()
    return db.getAllFromIndex('workoutEntries', 'by-exerciseId', exerciseId)
  },

  async listByDateRange(startDate: string, endDate: string): Promise<WorkoutEntry[]> {
    const db = await getDB()
    return db.getAllFromIndex('workoutEntries', 'by-date', IDBKeyRange.bound(startDate, endDate))
  },

  async get(id: string): Promise<WorkoutEntry | undefined> {
    const db = await getDB()
    return db.get('workoutEntries', id)
  },

  async create(input: NewEntry): Promise<WorkoutEntry> {
    const db = await getDB()
    const now = Date.now()
    const entry: WorkoutEntry = { ...input, id: createId(), createdAt: now, updatedAt: now }
    await db.add('workoutEntries', entry)
    return entry
  },

  async update(id: string, patch: Partial<Omit<WorkoutEntry, 'id' | 'createdAt'>>): Promise<WorkoutEntry> {
    const db = await getDB()
    const existing = await db.get('workoutEntries', id)
    if (!existing) throw new Error(`Entry ${id} not found`)
    const updated: WorkoutEntry = { ...existing, ...patch, id, updatedAt: Date.now() }
    await db.put('workoutEntries', updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('workoutEntries', id)
  },

  /** Re-inserts an entry exactly as it was (same id/timestamps) — used to
   *  restore from the trash store when a delete is undone. */
  async restoreDeleted(entry: WorkoutEntry): Promise<WorkoutEntry> {
    const db = await getDB()
    await db.put('workoutEntries', entry)
    return entry
  },
}
