import type { StatDefinition, StatDirection, StatType } from '../types'

export interface StatPreset {
  type: Exclude<StatType, 'customNumeric' | 'customText'>
  label: string
  unit: string | null
  direction: StatDirection
}

/**
 * Defaults are editable by the user after adding a stat (see StatDefPicker)
 * — these are sensible starting points, not fixed rules. A few notes on
 * the less obvious direction choices: heartRate and percentage default to
 * 'neutral' since neither is unambiguously better higher or lower for a
 * general tracker; restTime defaults to 'lowerIsBetter' the same way a
 * completion time would.
 */
export const STAT_PRESETS: StatPreset[] = [
  { type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter' },
  { type: 'reps', label: 'Repetitions', unit: null, direction: 'higherIsBetter' },
  { type: 'sets', label: 'Sets', unit: null, direction: 'higherIsBetter' },
  { type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter' },
  { type: 'distance', label: 'Distance', unit: 'km', direction: 'higherIsBetter' },
  { type: 'speed', label: 'Speed', unit: 'km/h', direction: 'higherIsBetter' },
  { type: 'incline', label: 'Incline', unit: '%', direction: 'higherIsBetter' },
  { type: 'elevation', label: 'Elevation Gain', unit: 'm', direction: 'higherIsBetter' },
  { type: 'calories', label: 'Calories', unit: 'kcal', direction: 'higherIsBetter' },
  { type: 'resistance', label: 'Resistance', unit: 'kg', direction: 'higherIsBetter' },
  { type: 'heartRate', label: 'Heart Rate', unit: 'bpm', direction: 'neutral' },
  { type: 'restTime', label: 'Rest Time', unit: 'sec', direction: 'lowerIsBetter' },
  { type: 'percentage', label: 'Percentage', unit: '%', direction: 'neutral' },
]

export function createStatDefFromPreset(preset: StatPreset): StatDefinition {
  return {
    id: crypto.randomUUID(),
    type: preset.type,
    label: preset.label,
    unit: preset.unit,
    direction: preset.direction,
    isText: false,
  }
}

export function createCustomNumericStatDef(label: string, unit: string | null, direction: StatDirection): StatDefinition {
  return { id: crypto.randomUUID(), type: 'customNumeric', label, unit, direction, isText: false }
}

export function createCustomTextStatDef(label: string): StatDefinition {
  return { id: crypto.randomUUID(), type: 'customText', label, unit: null, direction: 'neutral', isText: true }
}
