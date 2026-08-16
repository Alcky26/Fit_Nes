import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPeriodSummary, type PeriodSummary } from '../analytics/periodSummary'
import { computeAchievedGroups, type AchievedRecordGroup } from '../analytics/personalRecords'
import { PeriodStatsView } from '../components/stats/PeriodStatsView'
import { useExercises } from '../hooks/useExercises'
import { getMonthRange, getPreviousMonthRange } from '../utils/periods'

const MONTH_YEAR = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

export function MonthlyStatsPage() {
  const { year, month } = useParams<{ year?: string; month?: string }>()
  const navigate = useNavigate()
  const { exercises, loading: exercisesLoading } = useExercises()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const now = new Date()
  const targetYear = year ? Number(year) : now.getFullYear()
  const targetMonth = month ? Number(month) : now.getMonth() + 1
  const range = getMonthRange(targetYear, targetMonth)
  const previousRange = getPreviousMonthRange(targetYear, targetMonth)
  const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1

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
  }, [targetYear, targetMonth, exercisesLoading, exercisesById])

  function goToMonth(offset: number) {
    const base = new Date(targetYear, targetMonth - 1 + offset, 1)
    navigate(`/stats/monthly/${base.getFullYear()}/${base.getMonth() + 1}`)
  }

  if (exercisesLoading || !current || !previous) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  const chartData = current.dailyBreakdown.map((d) => ({ label: d.date.slice(-2), value: d.setCount }))

  return (
    <PeriodStatsView
      title="Monthly Statistics"
      rangeLabel={MONTH_YEAR.format(new Date(targetYear, targetMonth - 1, 1))}
      onPrev={() => goToMonth(-1)}
      onNext={() => goToMonth(1)}
      nextDisabled={isCurrentMonth}
      current={current}
      previous={previous}
      previousLabel="previous month"
      chartTitle="Sets by Day"
      chartData={chartData}
      recordGroups={recordGroups}
    />
  )
}
