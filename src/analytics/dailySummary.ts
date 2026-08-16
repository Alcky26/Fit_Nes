import { entryRepository, sessionRepository } from '../repositories'
import type { Exercise, WorkoutEntry, WorkoutSession } from '../types'

export interface DurationTotal {
  unit: string
  total: number
}

export interface DailySummary {
  date: string
  sessions: WorkoutSession[]
  entries: WorkoutEntry[]
  exerciseCount: number
  setCount: number
  /** Grouped by unit so values recorded in different units (one exercise
   *  tracks minutes, another tracks seconds) are never blended into one
   *  misleading total. Empty when nothing tracked a duration-type stat. */
  durationTotals: DurationTotal[]
}

/** Computes real totals for a single calendar day from the underlying
 *  workout records — nothing here is cached or stored separately, so it's
 *  always correct after an edit or delete. exercisesById is passed in
 *  (rather than fetched here) so callers that already loaded the exercise
 *  list via useExercises() don't pay for it twice. */
export async function getDailySummary(date: string, exercisesById: Map<string, Exercise>): Promise<DailySummary> {
  const [sessions, entries] = await Promise.all([
    sessionRepository.listByDate(date),
    entryRepository.listByDateRange(date, date),
  ])

  const exerciseIds = new Set(entries.map((entry) => entry.exerciseId))
  const setCount = entries.reduce((sum, entry) => sum + entry.sets.length, 0)

  const durationByUnit = new Map<string, number>()
  for (const entry of entries) {
    const exercise = exercisesById.get(entry.exerciseId)
    const durationDef = exercise?.statDefs.find((def) => def.type === 'duration')
    if (!durationDef) continue
    const unit = durationDef.unit ?? 'min'
    for (const set of entry.sets) {
      const value = set.values[durationDef.id]
      if (typeof value === 'number') {
        durationByUnit.set(unit, (durationByUnit.get(unit) ?? 0) + value)
      }
    }
  }

  return {
    date,
    sessions,
    entries,
    exerciseCount: exerciseIds.size,
    setCount,
    durationTotals: Array.from(durationByUnit, ([unit, total]) => ({ unit, total })),
  }
}
