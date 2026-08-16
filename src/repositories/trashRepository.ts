import { getDB } from '../db'
import type { TrashEntityType, TrashItem } from '../types'
import { UNDO_WINDOW_MS } from '../utils/constants'
import { createId } from './ids'

export const trashRepository = {
  async put(entityType: TrashEntityType, payload: unknown): Promise<TrashItem> {
    const db = await getDB()
    const now = Date.now()
    const item: TrashItem = {
      id: createId(),
      entityType,
      payload,
      deletedAt: now,
      expiresAt: now + UNDO_WINDOW_MS,
    }
    await db.put('trash', item)
    return item
  },

  async get(id: string): Promise<TrashItem | undefined> {
    const db = await getDB()
    return db.get('trash', id)
  },

  async remove(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('trash', id)
  },

  /** Sweeps expired entries. There's no background timer since the app
   *  may not be open — call this opportunistically (e.g. on app start). */
  async clearExpired(): Promise<void> {
    const db = await getDB()
    const tx = db.transaction('trash', 'readwrite')
    const index = tx.store.index('by-expiresAt')
    let cursor = await index.openCursor(IDBKeyRange.upperBound(Date.now()))
    while (cursor) {
      await cursor.delete()
      cursor = await cursor.continue()
    }
    await tx.done
  },
}
