import { useCallback, useEffect, useState } from 'react'
import { exerciseRepository } from '../repositories'
import type { Exercise } from '../types'

interface UseExercisesResult {
  exercises: Exercise[]
  loading: boolean
  refresh: () => Promise<void>
}

export function useExercises(): UseExercisesResult {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const all = await exerciseRepository.list()
    setExercises(all)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { exercises, loading, refresh }
}
