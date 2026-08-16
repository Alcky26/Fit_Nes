import type { StatDefinition } from './stats'

export type ExerciseCategory =
  | 'cardio'
  | 'back'
  | 'chest'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'fullBody'
  | 'other'

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  description: string
  /** References a StoredPhoto.id; null when no photo has been set. */
  photoId: string | null
  statDefs: StatDefinition[]
  /**
   * true = strength-style entries log multiple numbered sets (Seated Row).
   * false = cardio-style entries log one set of values per session (Treadmill).
   * Drives which entry UI (multi-set editor vs. single-value form) is shown.
   */
  usesSets: boolean
  /**
   * Soft-delete flag. Archived exercises are hidden from "add exercise"
   * pickers but their historical workout entries remain fully intact and
   * readable — see requirement in section 7 of the brief.
   */
  archived: boolean
  createdAt: number
  updatedAt: number
}
