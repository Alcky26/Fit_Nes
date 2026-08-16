import { daysAgoIso, formatIsoDate, parseIsoDate, todayIso } from './dates'

export interface DateRange {
  /** YYYY-MM-DD, inclusive */
  start: string
  /** YYYY-MM-DD, inclusive */
  end: string
}

export function addDaysIso(dateIso: string, days: number): string {
  const date = parseIsoDate(dateIso)
  date.setDate(date.getDate() + days)
  return formatIsoDate(date)
}

export function daysBetweenInclusive(range: DateRange): number {
  const diffMs = parseIsoDate(range.end).getTime() - parseIsoDate(range.start).getTime()
  // Rounded to absorb a single DST transition's ±1 hour within the range —
  // see section 21/48 of the brief on handling DST correctly.
  return Math.round(diffMs / 86_400_000) + 1
}

/** Monday-start week containing the given date. */
export function getWeekRange(dateIso: string): DateRange {
  const date = parseIsoDate(dateIso)
  const dayOfWeek = date.getDay() // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = (dayOfWeek + 6) % 7
  const start = addDaysIso(dateIso, -daysSinceMonday)
  return { start, end: addDaysIso(start, 6) }
}

/** month is 1-12. Uses the "day 0 of next month" trick so it's correct
 *  for every month length and for February in both leap and non-leap
 *  years without any manual leap-year logic. */
export function getMonthRange(year: number, month: number): DateRange {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return { start: formatIsoDate(start), end: formatIsoDate(end) }
}

export function getYearRange(year: number): DateRange {
  return { start: formatIsoDate(new Date(year, 0, 1)), end: formatIsoDate(new Date(year, 11, 31)) }
}

/** The calendar week immediately before the one containing dateIso. */
export function getPreviousWeekRange(dateIso: string): DateRange {
  return getWeekRange(addDaysIso(dateIso, -7))
}

/** The calendar month immediately before (year, month). */
export function getPreviousMonthRange(year: number, month: number): DateRange {
  return month === 1 ? getMonthRange(year - 1, 12) : getMonthRange(year, month - 1)
}

export function getPreviousYearRange(year: number): DateRange {
  return getYearRange(year - 1)
}

/**
 * The immediately preceding, non-overlapping period of the same *length*
 * — for an arbitrary custom range (e.g. "last 30 days"), not a calendar
 * unit. Deliberately NOT used for month/year comparisons: shifting a
 * 366-day leap year back by 366 days does not land on the previous
 * January 1st, so calendar views use getPreviousMonthRange /
 * getPreviousYearRange instead, per the "use sensible calendar
 * boundaries" principle for calendar-based selections.
 */
export function getPreviousPeriod(range: DateRange): DateRange {
  const length = daysBetweenInclusive(range)
  const end = addDaysIso(range.start, -1)
  const start = addDaysIso(end, -(length - 1))
  return { start, end }
}

/** Named rolling windows for the exercise progress page's "Compare
 *  Progress" control (section 20). These are trailing windows ending
 *  today, not calendar-aligned units, so plain day-count math is exactly
 *  right here — unlike getMonthRange/getYearRange above. */
export type ProgressPreset = 'last7' | 'last30' | 'last2months' | 'last6months' | 'lastYear'

const PROGRESS_PRESET_DAYS: Record<ProgressPreset, number> = {
  last7: 7,
  last30: 30,
  last2months: 60,
  last6months: 182,
  lastYear: 365,
}

export const PROGRESS_PRESET_LABELS: Record<ProgressPreset, string> = {
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  last2months: 'Last 2 Months',
  last6months: 'Last 6 Months',
  lastYear: 'Last Year',
}

export function getProgressPresetRange(preset: ProgressPreset): DateRange {
  const days = PROGRESS_PRESET_DAYS[preset]
  return { start: daysAgoIso(days - 1), end: todayIso() }
}

/** Returns a fixed 42-cell (6-week), Monday-start grid of ISO dates for a
 *  calendar month view — null for the leading/trailing blank cells
 *  outside the month, so a caller can render a fixed 7-column grid
 *  regardless of month length or starting weekday. */
export function getCalendarGridDates(year: number, month: number): (string | null)[] {
  const monthRange = getMonthRange(year, month)
  const firstOfMonth = parseIsoDate(monthRange.start)
  const firstWeekday = firstOfMonth.getDay() // 0 = Sunday .. 6 = Saturday
  const leadingBlanks = (firstWeekday + 6) % 7
  const daysInMonth = daysBetweenInclusive(monthRange)

  const cells: (string | null)[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(formatIsoDate(new Date(year, month - 1, day)))
  while (cells.length < 42) cells.push(null)

  return cells
}
