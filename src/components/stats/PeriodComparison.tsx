import type { PeriodSummary } from '../../analytics/periodSummary'

interface PeriodComparisonProps {
  current: PeriodSummary
  previous: PeriodSummary
  previousLabel: string
}

interface DeltaRow {
  label: string
  curr: number
  prev: number
}

function formatDelta(curr: number, prev: number): { text: string; direction: 'up' | 'down' | 'flat' } {
  const diff = curr - prev
  const sign = diff > 0 ? '+' : ''
  const percent = prev !== 0 ? ` (${sign}${((diff / prev) * 100).toFixed(0)}%)` : ''
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  return { text: `${sign}${diff}${percent}`, direction }
}

export function PeriodComparison({ current, previous, previousLabel }: PeriodComparisonProps) {
  const rows: DeltaRow[] = [
    { label: 'Training days', curr: current.trainingDays, prev: previous.trainingDays },
    { label: 'Workouts', curr: current.sessionCount, prev: previous.sessionCount },
    { label: 'Sets', curr: current.setCount, prev: previous.setCount },
  ]
  const previousHasData = previous.sessionCount > 0 || previous.setCount > 0 || previous.trainingDays > 0

  return (
    <section className="period-comparison">
      <h2>Compared with {previousLabel}</h2>
      {!previousHasData ? (
        <p className="placeholder-note">No workouts recorded during the previous comparison period.</p>
      ) : (
        <ul className="period-comparison__list">
          {rows.map((row) => {
            const { text, direction } = formatDelta(row.curr, row.prev)
            return (
              <li key={row.label}>
                <span>{row.label}</span>
                <span className={`period-comparison__delta period-comparison__delta--${direction}`}>{text}</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
