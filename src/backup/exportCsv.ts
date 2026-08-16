import { entryRepository, exerciseRepository, sessionRepository } from '../repositories'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const CSV_HEADER = ['Date', 'Time', 'Workout', 'Exercise', 'Category', 'Set', 'Metric', 'Value', 'Unit', 'Notes']

export async function buildHistoryCsv(): Promise<string> {
  const exercises = await exerciseRepository.list()
  const exercisesById = new Map(exercises.map((e) => [e.id, e]))
  const sessions = await sessionRepository.listAll()
  const sessionsById = new Map(sessions.map((s) => [s.id, s]))

  const entryLists = await Promise.all(exercises.map((ex) => entryRepository.listByExercise(ex.id)))
  const entries = entryLists.flat().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const rows: string[][] = [CSV_HEADER]

  for (const entry of entries) {
    const exercise = exercisesById.get(entry.exerciseId)
    const session = sessionsById.get(entry.sessionId)
    if (!exercise || !session) continue

    for (const set of entry.sets) {
      for (const def of exercise.statDefs) {
        const value = set.values[def.id]
        if (value === undefined || value === '') continue
        rows.push([
          entry.date,
          session.startTime ?? '',
          session.title,
          exercise.name,
          exercise.category,
          String(set.setNumber),
          def.label,
          String(value),
          def.unit ?? '',
          entry.notes,
        ])
      }
    }
  }

  // CRLF line endings (RFC 4180) so the file opens correctly in Excel,
  // Numbers, and Google Sheets rather than relying on their LF fallback.
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

export async function downloadHistoryCsv(): Promise<void> {
  const csv = await buildHistoryCsv()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fitness-tracker-history-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
