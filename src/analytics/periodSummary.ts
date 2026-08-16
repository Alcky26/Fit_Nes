import { entryRepository, sessionRepository } from '../repositories'
import type { Exercise, WorkoutEntry, WorkoutSession } from '../types'
import { addDaysIso, type DateRange } from '../utils/periods'
import type { DurationTotal } from './dailySummary'

export interface ExerciseFrequency {
  exerciseId: string
  exerciseName: string
  /** Number of entries logged for this exercise within the period. */
  entryCount: number
}

export interface DailyPoint {
  date: string
  setCount: number
  sessionCount: number
}

export interface PeriodSummary {
  range: DateRange
  /** Distinct calendar days with at least one workout session. */
  trainingDays: number
  sessionCount: number
  exerciseCount: number
  setCount: number
  durationTotals: DurationTotal[]
  exerciseFrequency: ExerciseFrequency[]
  /** One entry per calendar day in the range, zero-filled — used for
   *  charts so they never skip gaps. Aggregate with aggregateByMonth()
   *  for year-scale views instead of charting ~365 individual bars. */
  dailyBreakdown: DailyPoint[]
}

export async function getPeriodSummary(range: DateRange, exercisesById: Map<string, Exercise>): Promise<PeriodSummary> {
  const [sessions, entries] = await Promise.all([
    sessionRepository.listByDateRange(range.start, range.end),
    entryRepository.listByDateRange(range.start, range.end),
  ])

  const trainingDays = new Set(sessions.map((s) => s.date)).size
  const exerciseIds = new Set(entries.map((e) => e.exerciseId))
  const setCount = entries.reduce((sum, entry) => sum + entry.sets.length, 0)

  const durationByUnit = new Map<string, number>()
  const entryCountByExercise = new Map<string, number>()
  for (const entry of entries) {
    entryCountByExercise.set(entry.exerciseId, (entryCountByExercise.get(entry.exerciseId) ?? 0) + 1)

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

  const exerciseFrequency: ExerciseFrequency[] = Array.from(entryCountByExercise, ([exerciseId, entryCount]) => ({
    exerciseId,
    exerciseName: exercisesById.get(exerciseId)?.name ?? 'Deleted exercise',
    entryCount,
  })).sort((a, b) => b.entryCount - a.entryCount)

  return {
    range,
    trainingDays,
    sessionCount: sessions.length,
    exerciseCount: exerciseIds.size,
    setCount,
    durationTotals: Array.from(durationByUnit, ([unit, total]) => ({ unit, total })),
    exerciseFrequency,
    dailyBreakdown: buildDailyBreakdown(range, sessions, entries),
  }
}

function buildDailyBreakdown(range: DateRange, sessions: WorkoutSession[], entries: WorkoutEntry[]): DailyPoint[] {
  const setsByDate = new Map<string, number>()
  for (const entry of entries) {
    setsByDate.set(entry.date, (setsByDate.get(entry.date) ?? 0) + entry.sets.length)
  }
  const sessionsByDate = new Map<string, number>()
  for (const session of sessions) {
    sessionsByDate.set(session.date, (sessionsByDate.get(session.date) ?? 0) + 1)
  }

  const days: DailyPoint[] = []
  let cursor = range.start
  let guard = 0
  // Bounded loop (max ~1 year + slack) as a defensive guard against an
  // inverted or malformed range, since this can't be tested against a
  // real browser in this environment.
  while (cursor <= range.end && guard < 400) {
    days.push({ date: cursor, setCount: setsByDate.get(cursor) ?? 0, sessionCount: sessionsByDate.get(cursor) ?? 0 })
    cursor = addDaysIso(cursor, 1)
    guard += 1
  }
  return days
}

export interface MonthlyPoint {
  /** YYYY-MM */
  month: string
  setCount: number
  sessionCount: number
}

/** Rolls a dailyBreakdown up to one point per calendar month — used for
 *  the yearly view's "monthly training trends" chart instead of charting
 *  ~365 daily bars. */
export function aggregateByMonth(days: DailyPoint[]): MonthlyPoint[] {
  const byMonth = new Map<string, MonthlyPoint>()
  for (const day of days) {
    const month = day.date.slice(0, 7)
    const existing = byMonth.get(month) ?? { month, setCount: 0, sessionCount: 0 }
    existing.setCount += day.setCount
    existing.sessionCount += day.sessionCount
    byMonth.set(month, existing)
  }
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))
}
