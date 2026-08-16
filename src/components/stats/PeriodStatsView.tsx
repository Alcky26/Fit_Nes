import type { PeriodSummary } from '../../analytics/periodSummary'
import type { AchievedRecordGroup } from '../../analytics/personalRecords'
import { ExerciseFrequencyList } from './ExerciseFrequencyList'
import { PeriodBarChart } from './PeriodBarChart'
import { PeriodComparison } from './PeriodComparison'
import { PeriodStatTiles } from './PeriodStatTiles'
import { RecordsAchievedList } from './RecordsAchievedList'

interface PeriodStatsViewProps {
  title: string
  rangeLabel: string
  onPrev: () => void
  onNext: () => void
  nextDisabled?: boolean
  current: PeriodSummary
  previous: PeriodSummary
  previousLabel: string
  chartTitle: string
  chartData: { label: string; value: number }[]
  recordGroups: AchievedRecordGroup[]
}

export function PeriodStatsView({
  title,
  rangeLabel,
  onPrev,
  onNext,
  nextDisabled,
  current,
  previous,
  previousLabel,
  chartTitle,
  chartData,
  recordGroups,
}: PeriodStatsViewProps) {
  return (
    <div className="page">
      <header className="page__header">
        <h1>{title}</h1>
      </header>

      <div className="period-nav">
        <button type="button" className="btn period-nav__arrow" onClick={onPrev} aria-label="Previous period">
          ←
        </button>
        <span className="period-nav__label">{rangeLabel}</span>
        <button
          type="button"
          className="btn period-nav__arrow"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next period"
        >
          →
        </button>
      </div>

      <PeriodStatTiles summary={current} />

      <section className="period-chart-section">
        <h2>{chartTitle}</h2>
        <PeriodBarChart data={chartData} />
      </section>

      <PeriodComparison current={current} previous={previous} previousLabel={previousLabel} />

      <section className="exercise-frequency">
        <h2>Personal Records</h2>
        <RecordsAchievedList groups={recordGroups} />
      </section>

      <section className="exercise-frequency">
        <h2>Most Trained</h2>
        <ExerciseFrequencyList frequency={current.exerciseFrequency} />
      </section>

      <p className="field__hint">Flexible progress comparisons against previous sessions arrive with the exercise progress page (Phase 8).</p>
    </div>
  )
}
