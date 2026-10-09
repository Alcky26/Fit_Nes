import { entryRepository } from '../repositories'
import type { Exercise, SetRecord, WorkoutEntry } from '../types'
import { isWithinDays, todayIso } from '../utils/dates'
import { computeExerciseRecords, type ExerciseRecords } from './personalRecords'

/** A note older than this is considered stale and not shown as a reminder. */
export const RECENT_NOTE_DAYS = 30

export interface RecentNote {
  text: string
  date: string
}

export interface ExerciseReference {
  lastEntry: WorkoutEntry | null
  recentNote: RecentNote | null
  records: ExerciseRecords
}

/** Newest first: by date, then by creation time. */
export function sortNewestFirst(entries: WorkoutEntry[]): WorkoutEntry[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt - a.createdAt
  })
}

/** The most recent entry that has a non-empty note, but only if it was
 *  logged within the last RECENT_NOTE_DAYS days. */
export function findRecentNote(entriesNewestFirst: WorkoutEntry[], today: string): RecentNote | null {
  const withNote = entriesNewestFirst.find((e) => e.notes.trim().length > 0)
  if (!withNote) return null
  if (!isWithinDays(withNote.date, today, RECENT_NOTE_DAYS)) return null
  return { text: withNote.notes.trim(), date: withNote.date }
}

/** Independent copies of a previous entry's sets, safe to edit. */
export function cloneSets(sets: SetRecord[]): SetRecord[] {
  return sets.map((set) => ({ setNumber: set.setNumber, values: { ...set.values } }))
}

export async function loadExerciseReference(exercise: Exercise, today: string = todayIso()): Promise<ExerciseReference> {
  const entries = sortNewestFirst(await entryRepository.listByExercise(exercise.id))
  const records = await computeExerciseRecords(exercise)
  return { lastEntry: entries[0] ?? null, recentNote: findRecentNote(entries, today), records }
}
