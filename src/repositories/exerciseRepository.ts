import { getDB } from '../db'
import type { Exercise } from '../types'
import { createId } from './ids'

export type NewExercise = Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'archived'> & {
  archived?: boolean
}

export const exerciseRepository = {
  async list(): Promise<Exercise[]> {
    const db = await getDB()
    return db.getAll('exercises')
  },

  async listActive(): Promise<Exercise[]> {
    const all = await this.list()
    return all.filter((exercise) => !exercise.archived)
  },

  async get(id: string): Promise<Exercise | undefined> {
    const db = await getDB()
    return db.get('exercises', id)
  },

  async create(input: NewExercise): Promise<Exercise> {
    const db = await getDB()
    const now = Date.now()
    const exercise: Exercise = {
      ...input,
      id: createId(),
      archived: input.archived ?? false,
      createdAt: now,
      updatedAt: now,
    }
    await db.add('exercises', exercise)
    return exercise
  },

  async update(id: string, patch: Partial<Omit<Exercise, 'id' | 'createdAt'>>): Promise<Exercise> {
    const db = await getDB()
    const existing = await db.get('exercises', id)
    if (!existing) throw new Error(`Exercise ${id} not found`)
    const updated: Exercise = { ...existing, ...patch, id, updatedAt: Date.now() }
    await db.put('exercises', updated)
    return updated
  },

  /** Soft delete. Historical workout entries keep referencing this
   *  exercise id and stay fully readable — see section 7 of the brief. */
  async archive(id: string): Promise<Exercise> {
    return this.update(id, { archived: true })
  },

  async restore(id: string): Promise<Exercise> {
    return this.update(id, { archived: false })
  },

  /** Hard delete. The UI (Phase 3) only offers this when there is no
   *  workout history for the exercise; archive() is the safe default. */
  async hardDelete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('exercises', id)
  },

  /** Re-inserts an exercise exactly as it was (same id/timestamps).
   *  Used to restore from the trash store when a delete is undone. */
  async restoreDeleted(exercise: Exercise): Promise<Exercise> {
    const db = await getDB()
    await db.put('exercises', exercise)
    return exercise
  },
}
