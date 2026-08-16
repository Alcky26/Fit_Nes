import type { StatComparison, StatProgress } from '../../analytics/exerciseProgress'
import { ProgressLineChart } from './ProgressLineChart'

interface ProgressStatCardProps {
  stat: StatProgress
  comparison?: StatComparison
  showComparison: boolean
}

export function ProgressStatCard({ stat, comparison, showComparison }: ProgressStatCardProps) {
  return (
    <div className="progress-stat-card">
      <h3>{stat.label}</h3>
      <ProgressLineChart data={stat.chartPoints} />
      <div className="progress-stat-card__figures">
        {stat.best !== null && (
          <div className="progress-stat-card__figure">
            <span className="stat-figure">
              {stat.best}
              {stat.unit ?? ''}
            </span>
            <span className="today-stats__label">Best</span>
          </div>
        )}
        <div className="progress-stat-card__figure">
          <span className="stat-figure">
            {stat.average}
            {stat.unit ?? ''}
          </span>
          <span className="today-stats__label">Average</span>
        </div>
        <div className="progress-stat-card__figure">
          <span className="stat-figure">
            {stat.total}
            {stat.unit ?? ''}
          </span>
          <span className="today-stats__label">Total</span>
        </div>
      </div>

      {showComparison && (
        <p className="progress-stat-card__comparison">
          {!comparison || comparison.previousBest === null
            ? 'No workouts recorded during the previous comparison period.'
            : comparison.improvementPercent === null
              ? `Previous best: ${comparison.previousBest}${stat.unit ?? ''}`
              : `${comparison.improvementPercent > 0 ? '+' : ''}${comparison.improvementPercent.toFixed(1)}% vs previous best of ${comparison.previousBest}${stat.unit ?? ''}`}
        </p>
      )}
    </div>
  )
}
