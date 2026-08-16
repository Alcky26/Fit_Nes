import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { aggregateByMonth, getPeriodSummary, type PeriodSummary } from '../analytics/periodSummary'
import { computeAchievedGroups, type AchievedRecordGroup } from '../analytics/personalRecords'
import { PeriodStatsView } from '../components/stats/PeriodStatsView'
import { useExercises } from '../hooks/useExercises'
import { getPreviousYearRange, getYearRange } from '../utils/periods'

const MONTH_SHORT = new Intl.DateTimeFormat(undefined, { month: 'short' })

export function YearlyStatsPage() {
  const { year } = useParams<{ year?: string }>()
  const navigate = useNavigate()
  const { exercises, loading: exercisesLoading } = useExercises()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const now = new Date()
  const targetYear = year ? Number(year) : now.getFullYear()
  const range = getYearRange(targetYear)
  const previousRange = getPreviousYearRange(targetYear)
  const isCurrentYear = targetYear === now.getFullYear()

  const [current, setCurrent] = useState<PeriodSummary | null>(null)
  const [previous, setPrevious] = useState<PeriodSummary | null>(null)
  const [recordGroups, setRecordGroups] = useState<AchievedRecordGroup[]>([])

  useEffect(() => {
    if (exercisesLoading) return
    let cancelled = false
    Promise.all([getPeriodSummary(range, exercisesById), getPeriodSummary(previousRange, exercisesById)]).then(
      async ([curr, prev]) => {
        if (cancelled) return
        setCurrent(curr)
        setPrevious(prev)
        const groups = await computeAchievedGroups(curr.exerciseFrequency.map((f) => f.exerciseId), exercisesById, range)
        if (!cancelled) setRecordGroups(groups)
      },
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetYear, exercisesLoading, exercisesById])

  if (exercisesLoading || !current || !previous) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  const chartData = aggregateByMonth(current.dailyBreakdown).map((m) => {
    const [y, mo] = m.month.split('-').map(Number)
    return { label: MONTH_SHORT.format(new Date(y ?? targetYear, (mo ?? 1) - 1, 1)), value: m.setCount }
  })

  return (
    <PeriodStatsView
      title="Yearly Statistics"
      rangeLabel={String(targetYear)}
      onPrev={() => navigate(`/stats/yearly/${targetYear - 1}`)}
      onNext={() => navigate(`/stats/yearly/${targetYear + 1}`)}
      nextDisabled={isCurrentYear}
      current={current}
      previous={previous}
      previousLabel="previous year"
      chartTitle="Monthly Training Trends"
      chartData={chartData}
      recordGroups={recordGroups}
    />
  )
}
