import { useCallback, useEffect, useState } from 'react'
import { sessionRepository } from '../repositories'
import type { WorkoutSession } from '../types'

interface UseSessionsResult {
  sessions: WorkoutSession[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const all = await sessionRepository.listAll()
    setSessions(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { sessions, loading, refresh }
}
