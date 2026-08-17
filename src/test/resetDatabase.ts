import { DB_NAME, getDB, resetDBConnection } from '../db'

/**
 * Test-only: closes the current IndexedDB connection (if any) and deletes
 * the whole database, so each test starts from a clean slate.
 *
 * Closing first is essential. IndexedDB's deleteDatabase() request does
 * not complete while a connection to that database is still open — every
 * test file previously called deleteDatabase() without closing the prior
 * connection first, which stalls the delete and, combined with the next
 * repository call immediately opening a fresh connection behind it,
 * deadlocks fake-indexeddb's operation queue. That showed up as
 * cascading "Test timed out" / "Hook timed out" failures across every
 * test file that touches the database.
 */
export async function resetDatabase(): Promise<void> {
  const db = await getDB()
  db.close()
  resetDBConnection()
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
}
