import { getDB } from '../db'
import type { StoredPhoto } from '../types'
import { createId } from './ids'

export const photoRepository = {
  async get(id: string): Promise<StoredPhoto | undefined> {
    const db = await getDB()
    return db.get('photos', id)
  },

  /** Stores an already-optimized Blob as-is. The canvas resize/compress
   *  pipeline (WebP, ~1200-1600px longest edge) is implemented in
   *  src/utils/image.ts in Phase 3 and calls this with its output — this
   *  repository never does image processing itself. */
  async save(photo: Omit<StoredPhoto, 'id'> & { id?: string }): Promise<StoredPhoto> {
    const db = await getDB()
    const stored: StoredPhoto = { ...photo, id: photo.id ?? createId() }
    await db.put('photos', stored)
    return stored
  },

  async delete(id: string): Promise<void> {
    const db = await getDB()
    await db.delete('photos', id)
  },
}
