import { entryRepository } from '../repositories'
import type { Exercise, StatDirection, WorkoutEntry } from '../types'
import { parseIsoDate } from '../utils/dates'
import {
  daysBetweenInclusive,
  getPreviousPeriod,
  getProgressPresetRange,
  getWeekRange,
  type DateRange,
  type ProgressPreset,
} from '../utils/periods'
import { computeImprovementPercent } from './personalRecords'

export type ComparePeriodSelection =
  | { kind: 'preset'; preset: ProgressPreset }
  | { kind: 'allTime' }
  | { kind: 'custom'; range: DateRange }

export interface ChartPoint {
  label: string
  value: number
}

export interface StatProgress {
  statId: string
  label: string
  unit: string | null
  direction: StatDirection
  /** null for neutral stats — there's no "better" direction to pick a
   *  record from, per section 29's "do not calculate an improvement...
   *  where the comparison is meaningless." */
  best: number | null
  average: number
  total: number
  chartPoints: ChartPoint[]
}

export interface ExerciseProgressPeriod {
  /** null only for the all-time view — see computeExerciseProgress. */
  range: DateRange | null
  sessionCount: number
  trainingDays: number
  perWeekFrequency: number | null
  stats: StatProgress[]
  volume: StatProgress | null
}

export interface StatComparison {
  statId: string
  label: string
  unit: string | null
  currentBest: number | null
  previousBest: number | null
  improvementPercent: number | null
}

type Granularity = 'day' | 'week' | 'month'

/** Section 25's chart-density rule: short ranges chart every day, longer
 *  ranges roll up to weekly or monthly points so the chart stays
 *  readable. This only affects chartPoints — best/average/total are
 *  always computed from the full, unaggregated candidate list. */
function bucketGranularity(range: DateRange | null): Granularity {
  if (!range) return 'month' // all-time
  const length = daysBetweenInclusive(range)
  if (length <= 60) return 'day'
  if (length <= 200) return 'week'
  return 'month'
}

function bucketKey(dateIso: string, granularity: Granularity): string {
  if (granularity === 'day') return dateIso
  if (granularity === 'month') return dateIso.slice(0, 7)
  return getWeekRange(dateIso).start // Monday of that ISO week
}

const DAY_LABEL = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const MONTH_LABEL = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' })

function formatBucketLabel(key: string, granularity: Granularity): string {
  if (granularity === 'month') {
    const [year, month] = key.split('-').map(Number)
    if (!year || !month) return key
    return MONTH_LABEL.format(new Date(year, month - 1, 1))
  }
  return DAY_LABEL.format(parseIsoDate(key))
}

function buildChartPoints(
  candidates: { date: string; value: number }[],
  direction: StatDirection,
  granularity: Granularity,
): ChartPoint[] {
  const byBucket = new Map<string, number[]>()
  for (const candidate of candidates) {
    const key = bucketKey(candidate.date, granularity)
    const list = byBucket.get(key)
    if (list) list.push(candidate.value)
    else byBucket.set(key, [candidate.value])
  }

  return Array.from(byBucket.keys())
    .sort()
    .map((key) => {
      const values = byBucket.get(key) ?? []
      const aggregated =
        direction === 'lowerIsBetter'
          ? Math.min(...values)
          : direction === 'higherIsBetter'
            ? Math.max(...values)
            : values.reduce((sum, v) => sum + v, 0) / values.length
      return { label: formatBucketLabel(key, granularity), value: Math.round(aggregated * 100) / 100 }
    })
}

function extractCandidates(entries: WorkoutEntry[], statId: string): { date: string; value: number }[] {
  const candidates: { date: string; value: number }[] = []
  for (const entry of entries) {
    for (const set of entry.sets) {
      const value = set.values[statId]
      if (typeof value === 'number') candidates.push({ date: entry.date, value })
    }
  }
  return candidates
}

function summarizeStat(
  def: { id: string; label: string; unit: string | null; direction: StatDirection },
  candidates: { date: string; value: number }[],
  granularity: Granularity,
): StatProgress | null {
  if (candidates.length === 0) return null
  const values = candidates.map((c) => c.value)
  const total = values.reduce((sum, v) => sum + v, 0)
  const average = total / values.length
  const best = def.direction === 'higherIsBetter' ? Math.max(...values) : def.direction === 'lowerIsBetter' ? Math.min(...values) : null

  return {
    statId: def.id,
    label: def.label,
    unit: def.unit,
    direction: def.direction,
    best,
    average: Math.round(average * 100) / 100,
    total: Math.round(total * 100) / 100,
    chartPoints: buildChartPoints(candidates, def.direction, granularity),
  }
}

function computeVolumeProgress(exercise: Exercise, entries: WorkoutEntry[], granularity: Granularity): StatProgress | null {
  const weightDef = exercise.statDefs.find((d) => d.type === 'weight')
  const repsDef = exercise.statDefs.find((d) => d.type === 'reps')
  if (!weightDef || !repsDef) return null

  const candidates: { date: string; value: number }[] = []
  for (const entry of entries) {
    for (const set of entry.sets) {
      const weight = set.values[weightDef.id]
      const reps = set.values[repsDef.id]
      if (typeof weight === 'number' && typeof reps === 'number') {
        candidates.push({ date: entry.date, value: weight * reps })
      }
    }
  }
  return summarizeStat({ id: 'volume', label: 'Training Volume', unit: weightDef.unit, direction: 'higherIsBetter' }, candidates, granularity)
}

function selectionToRange(selection: ComparePeriodSelection): DateRange | null {
  if (selection.kind === 'allTime') return null
  if (selection.kind === 'preset') return getProgressPresetRange(selection.preset)
  return selection.range
}

/** Computes every tracked stat's period-scoped best/average/total and
 *  chart series, straight from entryRepository — nothing cached. */
export async function computeExerciseProgress(exercise: Exercise, selection: ComparePeriodSelection): Promise<ExerciseProgressPeriod> {
  const allEntries = await entryRepository.listByExercise(exercise.id)
  const range = selectionToRange(selection)
  const entries = range ? allEntries.filter((e) => e.date >= range.start && e.date <= range.end) : allEntries

  const trainingDays = new Set(entries.map((e) => e.date)).size
  const granularity = bucketGranularity(range)

  const stats: StatProgress[] = []
  for (const def of exercise.statDefs) {
    if (def.isText) continue
    const summary = summarizeStat(def, extractCandidates(entries, def.id), granularity)
    if (summary) stats.push(summary)
  }

  const periodDays = range ? daysBetweenInclusive(range) : null
  const perWeekFrequency = periodDays ? Math.round(((entries.length / periodDays) * 7 + Number.EPSILON) * 10) / 10 : null

  return {
    range,
    sessionCount: entries.length,
    trainingDays,
    perWeekFrequency,
    stats,
    volume: computeVolumeProgress(exercise, entries, granularity),
  }
}

/**
 * Adds the previous-period comparison (section 21/22) on top of
 * computeExerciseProgress. All Time deliberately has no previous period
 * — see section 23 — so `previous` and `comparisons` are empty in that
 * case rather than comparing against an arbitrary earlier slice.
 */
export async function computeProgressComparison(
  exercise: Exercise,
  selection: ComparePeriodSelection,
): Promise<{ current: ExerciseProgressPeriod; previous: ExerciseProgressPeriod | null; comparisons: StatComparison[] }> {
  const current = await computeExerciseProgress(exercise, selection)
  if (selection.kind === 'allTime' || !current.range) {
    return { current, previous: null, comparisons: [] }
  }

  const previousRange = getPreviousPeriod(current.range)
  const previous = await computeExerciseProgress(exercise, { kind: 'custom', range: previousRange })

  const comparisons: StatComparison[] = current.stats.map((stat) => {
    const prevStat = previous.stats.find((s) => s.statId === stat.statId)
    const previousBest = prevStat?.best ?? null
    const improvementPercent =
      stat.best !== null && previousBest !== null ? computeImprovementPercent(stat.best, previousBest, stat.direction) : null
    return { statId: stat.statId, label: stat.label, unit: stat.unit, currentBest: stat.best, previousBest, improvementPercent }
  })

  if (current.volume) {
    const previousBest = previous.volume?.best ?? null
    const improvementPercent =
      current.volume.best !== null && previousBest !== null
        ? computeImprovementPercent(current.volume.best, previousBest, 'higherIsBetter')
        : null
    comparisons.push({
      statId: 'volume',
      label: current.volume.label,
      unit: current.volume.unit,
      currentBest: current.volume.best,
      previousBest,
      improvementPercent,
    })
  }

  return { current, previous, comparisons }
}
