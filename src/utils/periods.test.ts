import { describe, expect, it } from 'vitest'
import {
  addDaysIso,
  daysBetweenInclusive,
  getCalendarGridDates,
  getMonthRange,
  getPreviousMonthRange,
  getPreviousPeriod,
  getPreviousWeekRange,
  getPreviousYearRange,
  getWeekRange,
  getYearRange,
} from './periods'

describe('getWeekRange', () => {
  it('returns the same Monday-Sunday range regardless of which weekday is passed in', () => {
    expect(getWeekRange('2026-08-10')).toEqual({ start: '2026-08-10', end: '2026-08-16' }) // Monday
    expect(getWeekRange('2026-08-13')).toEqual({ start: '2026-08-10', end: '2026-08-16' }) // Thursday
    expect(getWeekRange('2026-08-16')).toEqual({ start: '2026-08-10', end: '2026-08-16' }) // Sunday
  })
})

describe('getMonthRange', () => {
  it('handles a 31-day month, a 30-day month, and February in a non-leap year', () => {
    expect(getMonthRange(2026, 1)).toEqual({ start: '2026-01-01', end: '2026-01-31' })
    expect(getMonthRange(2026, 4)).toEqual({ start: '2026-04-01', end: '2026-04-30' })
    expect(getMonthRange(2026, 2)).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('handles February 29 in a leap year', () => {
    expect(getMonthRange(2028, 2)).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })
})

describe('getYearRange', () => {
  it('spans the full calendar year', () => {
    expect(getYearRange(2026)).toEqual({ start: '2026-01-01', end: '2026-12-31' })
  })
})

describe('getPreviousWeekRange', () => {
  it('is exactly seven days earlier, still Monday-aligned', () => {
    expect(getPreviousWeekRange('2026-08-13')).toEqual({ start: '2026-08-03', end: '2026-08-09' })
  })
})

describe('getPreviousMonthRange', () => {
  it('steps back a month within the same year', () => {
    expect(getPreviousMonthRange(2026, 8)).toEqual({ start: '2026-07-01', end: '2026-07-31' })
  })

  it('crosses the year boundary from January to December', () => {
    expect(getPreviousMonthRange(2026, 1)).toEqual({ start: '2025-12-01', end: '2025-12-31' })
  })

  it('correctly lands on a leap February when appropriate', () => {
    expect(getPreviousMonthRange(2028, 3)).toEqual({ start: '2028-02-01', end: '2028-02-29' })
  })
})

describe('getPreviousYearRange', () => {
  it('is the full previous calendar year', () => {
    expect(getPreviousYearRange(2026)).toEqual({ start: '2025-01-01', end: '2025-12-31' })
  })

  it('stays calendar-aligned even when the current year is a leap year (the case a naive day-count shift gets wrong)', () => {
    // 2028 is a leap year (366 days). A generic "shift back by the same
    // length" comparison would land one day short of 2027-01-01. The
    // calendar-aware version must not have that bug.
    expect(getPreviousYearRange(2028)).toEqual({ start: '2027-01-01', end: '2027-12-31' })
  })
})

describe('daysBetweenInclusive', () => {
  it('counts inclusively', () => {
    expect(daysBetweenInclusive({ start: '2026-08-10', end: '2026-08-16' })).toBe(7)
    expect(daysBetweenInclusive({ start: '2026-08-01', end: '2026-08-01' })).toBe(1)
  })

  it('counts a leap February correctly', () => {
    expect(daysBetweenInclusive({ start: '2028-02-01', end: '2028-02-29' })).toBe(29)
  })
})

describe('getCalendarGridDates', () => {
  it('is Monday-aligned: August 2026 starts on a Saturday, so there are 5 leading blanks', () => {
    const grid = getCalendarGridDates(2026, 8)
    expect(grid).toHaveLength(42)
    expect(grid.slice(0, 5)).toEqual([null, null, null, null, null])
    expect(grid[5]).toBe('2026-08-01')
    expect(grid[6]).toBe('2026-08-02')
  })

  it('includes every day of the month exactly once, in order', () => {
    const grid = getCalendarGridDates(2026, 2) // February 2026, 28 days, non-leap
    const days = grid.filter((d): d is string => d !== null)
    expect(days).toHaveLength(28)
    expect(days[0]).toBe('2026-02-01')
    expect(days[days.length - 1]).toBe('2026-02-28')
  })

  it('handles a leap February correctly', () => {
    const grid = getCalendarGridDates(2028, 2)
    const days = grid.filter((d): d is string => d !== null)
    expect(days).toHaveLength(29)
    expect(days[days.length - 1]).toBe('2028-02-29')
  })
})

describe('getPreviousPeriod (generic, length-based)', () => {
  it('returns a non-overlapping period of the same length immediately before the range', () => {
    const range = { start: '2026-08-10', end: '2026-08-16' } // 7 days
    const previous = getPreviousPeriod(range)
    expect(previous).toEqual({ start: '2026-08-03', end: '2026-08-09' })
    expect(daysBetweenInclusive(previous)).toBe(daysBetweenInclusive(range))
    // Non-overlapping: previous.end is exactly one day before range.start.
    expect(addDaysIso(previous.end, 1)).toBe(range.start)
  })

  it('demonstrates why calendar views use the dedicated previous-month/year helpers instead: a length-based shift can miss a leap day', () => {
    const range = getYearRange(2028) // leap year, 366 days
    const previous = getPreviousPeriod(range)
    // A pure 366-day shift lands one day short of the full previous
    // calendar year — this is the exact bug getPreviousYearRange avoids.
    expect(previous).not.toEqual({ start: '2027-01-01', end: '2027-12-31' })
    expect(previous.start).toBe('2026-12-31')
  })
})
