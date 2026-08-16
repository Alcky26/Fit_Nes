import { entryRepository } from '../repositories'
import type { Exercise, StatDirection, WorkoutEntry } from '../types'
import type { DateRange } from '../utils/periods'

export interface RecordCandidate {
  entryId: string
  sessionId: string
  date: string
  createdAt: number
  setNumber: number
  value: number
}

export interface StatRecord {
  statId: string
  label: string
  unit: string | null
  direction: 'higherIsBetter' | 'lowerIsBetter'
  best: RecordCandidate
  /** What the record was before `best` was set — null if `best` is the
   *  very first qualifying value ever recorded for this stat. */
  previousBest: RecordCandidate | null
}

export interface ExerciseRecords {
  exerciseId: string
  statRecords: StatRecord[]
  /** weight × reps per set — only present when the exercise tracks both
   *  a weight-type and a reps-type stat. Section 28's training-volume
   *  record. */
  volumeRecord: StatRecord | null
}

function sortCandidates(candidates: RecordCandidate[]): RecordCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
    return a.setNumber - b.setNumber
  })
}

function computeRunningRecord(
  candidates: RecordCandidate[],
  direction: 'higherIsBetter' | 'lowerIsBetter',
): { best: RecordCandidate; previousBest: RecordCandidate | null } | null {
  const sorted = sortCandidates(candidates)
  const [first, ...rest] = sorted
  if (!first) return null

  let best = first
  let previousBest: RecordCandidate | null = null
  for (const candidate of rest) {
    const improved = direction === 'higherIsBetter' ? candidate.value > best.value : candidate.value < best.value
    if (improved) {
      previousBest = best
      best = candidate
    }
  }
  return { best, previousBest }
}

function candidatesForStat(entries: WorkoutEntry[], statId: string): RecordCandidate[] {
  const candidates: RecordCandidate[] = []
  for (const entry of entries) {
    for (const set of entry.sets) {
      const value = set.values[statId]
      if (typeof value === 'number') {
        candidates.push({
          entryId: entry.id,
          sessionId: entry.sessionId,
          date: entry.date,
          createdAt: entry.createdAt,
          setNumber: set.setNumber,
          value,
        })
      }
    }
  }
  return candidates
}

function computeVolumeRecord(exercise: Exercise, entries: WorkoutEntry[]): StatRecord | null {
  const weightDef = exercise.statDefs.find((d) => d.type === 'weight')
  const repsDef = exercise.statDefs.find((d) => d.type === 'reps')
  if (!weightDef || !repsDef) return null

  const candidates: RecordCandidate[] = []
  for (const entry of entries) {
    for (const set of entry.sets) {
      const weight = set.values[weightDef.id]
      const reps = set.values[repsDef.id]
      if (typeof weight === 'number' && typeof reps === 'number') {
        candidates.push({
          entryId: entry.id,
          sessionId: entry.sessionId,
          date: entry.date,
          createdAt: entry.createdAt,
          setNumber: set.setNumber,
          value: weight * reps,
        })
      }
    }
  }

  const record = computeRunningRecord(candidates, 'higherIsBetter')
  if (!record) return null
  return { statId: 'volume', label: 'Training Volume', unit: weightDef.unit, direction: 'higherIsBetter', ...record }
}

/** Computes every stat's current record (and what it was before) plus the
 *  training-volume record, straight from this exercise's entries. */
export async function computeExerciseRecords(exercise: Exercise): Promise<ExerciseRecords> {
  const entries = await entryRepository.listByExercise(exercise.id)

  const statRecords: StatRecord[] = []
  for (const def of exercise.statDefs) {
    if (def.isText) continue
    if (def.direction === 'neutral') continue
    const direction = def.direction // narrowed: 'higherIsBetter' | 'lowerIsBetter'

    const record = computeRunningRecord(candidatesForStat(entries, def.id), direction)
    if (record) {
      statRecords.push({ statId: def.id, label: def.label, unit: def.unit, direction, ...record })
    }
  }

  return { exerciseId: exercise.id, statRecords, volumeRecord: computeVolumeRecord(exercise, entries) }
}

function allRecords(records: ExerciseRecords): StatRecord[] {
  return records.volumeRecord ? [...records.statRecords, records.volumeRecord] : records.statRecords
}

/** Records set by one specific entry — used right after saving to show a
 *  "New Personal Record" banner. Includes a stat's very first recorded
 *  value, since that's trivially your current best too. */
export function recordsSetByEntry(records: ExerciseRecords, entryId: string): StatRecord[] {
  return allRecords(records).filter((r) => r.best.entryId === entryId)
}

/** Records whose current best falls within a date range — used by the
 *  daily/weekly/monthly/yearly statistics pages to show "personal records
 *  achieved" during that period, regardless of which entry set them. */
export function recordsInRange(records: ExerciseRecords, range: DateRange): StatRecord[] {
  return allRecords(records).filter((r) => r.best.date >= range.start && r.best.date <= range.end)
}

/**
 * Improvement between two values, direction-aware: for a lower-is-better
 * stat (e.g. a completion time), a decrease is a positive improvement.
 * Returns null for neutral stats (no improvement claim is meaningful) and
 * when previous is 0 (percentage change is undefined/infinite).
 */
export function computeImprovementPercent(current: number, previous: number, direction: StatDirection): number | null {
  if (direction === 'neutral' || previous === 0) return null
  const rawPercent = ((current - previous) / previous) * 100
  return direction === 'lowerIsBetter' ? -rawPercent : rawPercent
}

export interface AchievedRecordGroup {
  exerciseId: string
  exerciseName: string
  records: StatRecord[]
}

/** For each given exercise id, computes its records and keeps only the
 *  ones achieved within range — the shared "personal records achieved"
 *  computation behind the daily/weekly/monthly/yearly statistics pages. */
export async function computeAchievedGroups(
  exerciseIds: string[],
  exercisesById: Map<string, Exercise>,
  range: DateRange,
): Promise<AchievedRecordGroup[]> {
  const groups = await Promise.all(
    exerciseIds.map(async (exerciseId): Promise<AchievedRecordGroup | null> => {
      const exercise = exercisesById.get(exerciseId)
      if (!exercise) return null
      const records = await computeExerciseRecords(exercise)
      return { exerciseId, exerciseName: exercise.name, records: recordsInRange(records, range) }
    }),
  )
  return groups.filter((g): g is AchievedRecordGroup => g !== null)
}
