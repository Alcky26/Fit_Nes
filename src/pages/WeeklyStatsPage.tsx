import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPeriodSummary, type PeriodSummary } from '../analytics/periodSummary'
import { computeAchievedGroups, type AchievedRecordGroup } from '../analytics/personalRecords'
import { PeriodStatsView } from '../components/stats/PeriodStatsView'
import { useExercises } from '../hooks/useExercises'
import { formatDateLong, parseIsoDate, todayIso } from '../utils/dates'
import { addDaysIso, getPreviousWeekRange, getWeekRange } from '../utils/periods'

const WEEKDAY_SHORT = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

export function WeeklyStatsPage() {
  const { date } = useParams<{ date?: string }>()
  const navigate = useNavigate()
  const { exercises, loading: exercisesLoading } = useExercises()
  const exercisesById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])

  const anchorDate = date ?? todayIso()
  const range = getWeekRange(anchorDate)
  const previousRange = getPreviousWeekRange(anchorDate)

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
    // range/previousRange are pure functions of anchorDate, recomputed
    // fresh every render — depending on anchorDate directly is equivalent
    // and avoids re-running the effect on every render from a new object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate, exercisesLoading, exercisesById])

  if (exercisesLoading || !current || !previous) {
    return (
      <div className="page">
        <p className="placeholder-note">Loading…</p>
      </div>
    )
  }

  const chartData = current.dailyBreakdown.map((d) => ({
    label: WEEKDAY_SHORT.format(parseIsoDate(d.date)),
    value: d.setCount,
  }))

  return (
    <PeriodStatsView
      title="Weekly Statistics"
      rangeLabel={`${formatDateLong(range.start)} – ${formatDateLong(range.end)}`}
      onPrev={() => navigate(`/stats/weekly/${addDaysIso(range.start, -7)}`)}
      onNext={() => navigate(`/stats/weekly/${addDaysIso(range.start, 7)}`)}
      nextDisabled={range.end >= todayIso()}
      current={current}
      previous={previous}
      previousLabel="previous week"
      chartTitle="Sets by Day"
      chartData={chartData}
      recordGroups={recordGroups}
    />
  )
}
