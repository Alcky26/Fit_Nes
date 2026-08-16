import type { ExerciseCategory } from '../types'

export const CATEGORY_OPTIONS: { value: ExerciseCategory; label: string }[] = [
  { value: 'cardio', label: 'Cardio' },
  { value: 'back', label: 'Back' },
  { value: 'chest', label: 'Chest' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
  { value: 'fullBody', label: 'Full Body' },
  { value: 'other', label: 'Other' },
]

export function categoryLabel(category: ExerciseCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category
}
