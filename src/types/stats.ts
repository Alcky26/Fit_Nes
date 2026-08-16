/** Predefined statistic types selectable when configuring an exercise. */
export type StatType =
  | 'weight'
  | 'reps'
  | 'sets'
  | 'duration'
  | 'distance'
  | 'speed'
  | 'incline'
  | 'elevation'
  | 'calories'
  | 'resistance'
  | 'heartRate'
  | 'restTime'
  | 'percentage'
  | 'customNumeric'
  | 'customText'

/**
 * Whether a larger value, a smaller value, or neither represents
 * improvement. Drives every improvement/PR calculation in src/analytics —
 * 'neutral' stats are shown but never scored.
 */
export type StatDirection = 'higherIsBetter' | 'lowerIsBetter' | 'neutral'

export interface StatDefinition {
  id: string
  type: StatType
  label: string
  /** null for unitless numeric stats (e.g. "Level") and for text stats. */
  unit: string | null
  direction: StatDirection
  /** customText is the only built-in text type; all others are numeric. */
  isText: boolean
}

export type StatValue = number | string

/** One exercise's recorded values for a single set/entry, keyed by StatDefinition.id. */
export type StatValues = Record<string, StatValue>
