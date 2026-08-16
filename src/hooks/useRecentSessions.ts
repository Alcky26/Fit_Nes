import { useEffect, useState } from 'react'
import { sessionRepository } from '../repositories'
import type { WorkoutSession } from '../types'
import { daysAgoIso, todayIso } from '../utils/dates'

const LOOKBACK_DAYS = 60

export function useRecentSessions(limit = 5) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    sessionRepository.listByDateRange(daysAgoIso(LOOKBACK_DAYS), todayIso()).then((results) => {
      if (cancelled) return
      const sorted = [...results].sort((a, b) => b.date.localeCompare(a.date))
      setSessions(sorted.slice(0, limit))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [limit])

  return { sessions, loading }
}
