import { getDB } from '../db'

const ALL_STORES = ['exercises', 'workoutSessions', 'workoutEntries', 'photos', 'personalRecords', 'settings', 'trash'] as const

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(ALL_STORES, 'readwrite')
  await Promise.all(ALL_STORES.map((name) => tx.objectStore(name).clear()))
  await tx.done
}
