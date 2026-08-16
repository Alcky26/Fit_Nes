import type { PeriodSummary } from '../../analytics/periodSummary'

interface PeriodStatTilesProps {
  summary: PeriodSummary
}

export function PeriodStatTiles({ summary }: PeriodStatTilesProps) {
  return (
    <div className="today-stats">
      <div className="today-stats__tile">
        <span className="stat-figure">{summary.trainingDays}</span>
        <span className="today-stats__label">Training Day{summary.trainingDays === 1 ? '' : 's'}</span>
      </div>
      <div className="today-stats__tile">
        <span className="stat-figure">{summary.sessionCount}</span>
        <span className="today-stats__label">Workout{summary.sessionCount === 1 ? '' : 's'}</span>
      </div>
      <div className="today-stats__tile">
        <span className="stat-figure">{summary.setCount}</span>
        <span className="today-stats__label">Set{summary.setCount === 1 ? '' : 's'}</span>
      </div>
      {summary.durationTotals.map((d) => (
        <div className="today-stats__tile" key={d.unit}>
          <span className="stat-figure">{d.total}</span>
          <span className="today-stats__label">{d.unit}</span>
        </div>
      ))}
    </div>
  )
}
