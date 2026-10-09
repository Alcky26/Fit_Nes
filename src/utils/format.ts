import type { StatDefinition, StatValues } from '../types'

const UNITS = ['B', 'KB', 'MB', 'GB'] as const

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${UNITS[exponent]}`
}

/** Renders a set's recorded values as a compact summary, e.g.
 *  "30kg · 12" — skips any stat with no value recorded. Shared by
 *  EntrySummary (workout history) and the personal-records engine, so a
 *  record can show exactly which set it came from rather than just a
 *  bare number that could be mistaken for coming from the same set as
 *  another independently-tracked record. */
export function formatStatValues(statDefs: StatDefinition[], values: StatValues): string {
  return statDefs
    .filter((def) => values[def.id] !== undefined && values[def.id] !== '')
    .map((def) => {
      const value = values[def.id]
      return def.unit ? `${value}${def.unit}` : `${value}`
    })
    .join(' · ')
}

/** 90 → "1 min 30 s", 60 → "1 min", 45 → "45 s". */
export function formatRestSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes === 0) return `${rest} s`
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}

/** One-line summary of an exercise's optional targets, or null if none
 *  are set (older exercises saved before targets existed have neither). */
export function formatExerciseTargets(exercise: { targetReps?: string | null; restSeconds?: number | null }): string | null {
  const parts: string[] = []
  if (exercise.targetReps) parts.push(`Target ${exercise.targetReps} reps`)
  if (exercise.restSeconds) parts.push(`Rest ${formatRestSeconds(exercise.restSeconds)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}
