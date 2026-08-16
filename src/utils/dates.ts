export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`Invalid ISO date: ${isoDate}`)
  return new Date(year, month - 1, day)
}

export function formatIsoDate(date: Date): string {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 10)
}

export function todayIso(): string {
  return formatIsoDate(new Date())
}

export function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return formatIsoDate(d)
}

const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

/** Formats a YYYY-MM-DD string as e.g. "Wed, Aug 12". Parses the parts
 *  manually and builds a local Date instead of `new Date(isoDate)`, which
 *  parses as UTC midnight and can render as the previous day for anyone
 *  west of UTC. */
export function formatDateLong(isoDate: string): string {
  try {
    return WEEKDAY_MONTH_DAY.format(parseIsoDate(isoDate))
  } catch {
    return isoDate
  }
}
