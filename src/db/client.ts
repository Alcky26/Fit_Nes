import { openDB, type IDBPDatabase } from 'idb'
import type { FitnessDB } from './schema'

export const DB_NAME = 'fitness-tracker'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<FitnessDB>> | null = null

/**
 * Returns the shared IndexedDB connection, opening (and migrating) it on
 * first call. Every repository goes through this — components never call
 * `openDB` or touch object stores directly.
 */
export function getDB(): Promise<IDBPDatabase<FitnessDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FitnessDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('exercises', { keyPath: 'id' })

          const sessions = db.createObjectStore('workoutSessions', { keyPath: 'id' })
          sessions.createIndex('by-date', 'date')

          const entries = db.createObjectStore('workoutEntries', { keyPath: 'id' })
          entries.createIndex('by-exerciseId', 'exerciseId')
          entries.createIndex('by-sessionId', 'sessionId')
          entries.createIndex('by-date', 'date')

          db.createObjectStore('photos', { keyPath: 'id' })

          const records = db.createObjectStore('personalRecords', { keyPath: 'id' })
          records.createIndex('by-exerciseId', 'exerciseId')

          db.createObjectStore('settings', { keyPath: 'key' })

          const trash = db.createObjectStore('trash', { keyPath: 'id' })
          trash.createIndex('by-expiresAt', 'expiresAt')
        }
        // Future schema changes add another `if (oldVersion < N)` block
        // here and bump DB_VERSION below — existing stores and data are
        // preserved; IndexedDB upgrades are additive by default.
      },
    })
  }
  return dbPromise
}

/**
 * Test-only: drops the cached connection so the next `getDB()` opens a
 * fresh handle — used between tests after deleting the fake-indexeddb
 * database to keep tests isolated from each other.
 */
export function resetDBConnection(): void {
  dbPromise = null
}
