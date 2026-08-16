import { getDB } from '../db'
import type { AppSettings } from '../types'

const DEFAULT_SETTINGS: AppSettings = { key: 'app', theme: 'system', units: 'metric' }

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const db = await getDB()
    const existing = await db.get('settings', 'app')
    return existing ?? DEFAULT_SETTINGS
  },

  async update(patch: Partial<Omit<AppSettings, 'key'>>): Promise<AppSettings> {
    const db = await getDB()
    const current = await this.get()
    const updated: AppSettings = { ...current, ...patch }
    await db.put('settings', updated)
    return updated
  },
}
