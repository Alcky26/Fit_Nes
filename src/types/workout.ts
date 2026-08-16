import type { StatValues } from './stats'

export interface SetRecord {
  setNumber: number
  values: StatValues
}

/** A single exercise performed within a session. Always holds an array of
 *  sets — cardio-style entries just have exactly one. This keeps the model
 *  uniform instead of branching the data shape by exercise type. */
export interface WorkoutEntry {
  id: string
  sessionId: string
  exerciseId: string
  /** Denormalized from the parent session (YYYY-MM-DD) so entries can be
   *  queried by date range without joining through sessions. */
  date: string
  sets: SetRecord[]
  notes: string
  createdAt: number
  updatedAt: number
}

export interface WorkoutSession {
  id: string
  date: string // YYYY-MM-DD, local calendar date
  startTime: string | null // HH:mm
  endTime: string | null // HH:mm
  title: string
  notes: string
  createdAt: number
  updatedAt: number
}
