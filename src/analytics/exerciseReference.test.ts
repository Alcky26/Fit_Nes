import { describe, expect, it } from 'vitest'
import type { WorkoutEntry } from '../types'
import { isWithinDays } from '../utils/dates'
import { formatRestSeconds } from '../utils/format'
import { cloneSets, findRecentNote, sortNewestFirst } from './exerciseReference'

function entry(id: string, date: string, notes: string, createdAt = 0): WorkoutEntry {
  return {
    id,
    sessionId: 's',
    exerciseId: 'e',
    date,
    notes,
    sets: [{ setNumber: 1, values: { reps: 10 } }],
    createdAt,
    updatedAt: createdAt,
  }
}

describe('sortNewestFirst', () => {
  it('orders by date, then by creation time', () => {
    const sorted = sortNewestFirst([entry('a', '2026-09-01', ''), entry('b', '2026-09-05', '', 1), entry('c', '2026-09-05', '', 2)])
    expect(sorted.map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('findRecentNote', () => {
  it('returns the newest non-empty note within 30 days', () => {
    const entries = sortNewestFirst([entry('a', '2026-09-01', 'older'), entry('b', '2026-09-05', '  '), entry('c', '2026-09-08', 'newest')])
    expect(findRecentNote(entries, '2026-09-20')).toEqual({ text: 'newest', date: '2026-09-08' })
  })

  it('ignores notes older than 30 days', () => {
    const entries = sortNewestFirst([entry('a', '2026-07-01', 'old note')])
    expect(findRecentNote(entries, '2026-09-20')).toBeNull()
  })

  it('includes a note exactly 30 days old and returns null with no notes', () => {
    expect(findRecentNote([entry('a', '2026-08-21', 'edge')], '2026-09-20')?.text).toBe('edge')
    expect(findRecentNote([entry('a', '2026-09-19', '')], '2026-09-20')).toBeNull()
  })
})

describe('cloneSets', () => {
  it('copies sets so editing the copy leaves the original untouched', () => {
    const original = [{ setNumber: 1, values: { reps: 10 } }]
    const copy = cloneSets(original)
    copy[0]!.values.reps = 99
    expect(original[0]!.values.reps).toBe(10)
  })
})

describe('isWithinDays / formatRestSeconds', () => {
  it('handles boundaries and the future', () => {
    expect(isWithinDays('2026-09-20', '2026-09-20', 30)).toBe(true)
    expect(isWithinDays('2026-08-20', '2026-09-20', 30)).toBe(false)
    expect(isWithinDays('2026-09-21', '2026-09-20', 30)).toBe(false)
  })

  it('formats rest times', () => {
    expect(formatRestSeconds(45)).toBe('45 s')
    expect(formatRestSeconds(60)).toBe('1 min')
    expect(formatRestSeconds(90)).toBe('1 min 30 s')
  })
})
