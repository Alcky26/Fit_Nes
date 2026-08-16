import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { ExerciseCard } from '../components/exercises/ExerciseCard'
import { useExercises } from '../hooks/useExercises'
import type { ExerciseCategory } from '../types'
import { CATEGORY_OPTIONS } from '../utils/categories'

export function ExercisesPage() {
  const { exercises, loading } = useExercises()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<ExerciseCategory | 'all'>('all')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return exercises
      .filter((e) => (showArchived ? e.archived : !e.archived))
      .filter((e) => category === 'all' || e.category === category)
      .filter((e) => e.name.toLowerCase().includes(query))
  }, [exercises, search, category, showArchived])

  return (
    <div className="page">
      <header className="page__header page__header--row">
        <h1>Exercises</h1>
        <Link to="/exercises/new" className="btn btn--primary">
          + Add
        </Link>
      </header>

      {!loading && exercises.length === 0 && (
        <EmptyState
          title="No exercises yet"
          description="Add your first exercise to start tracking."
          action={
            <Link to="/exercises/new" className="btn btn--primary btn--lg">
              + Add Exercise
            </Link>
          }
        />
      )}

      {exercises.length > 0 && (
        <>
          <div className="exercises-filters">
            <input
              className="exercises-filters__search"
              type="search"
              placeholder="Search exercises"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search exercises"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExerciseCategory | 'all')}
              aria-label="Filter by category"
            >
              <option value="all">All categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="checkbox-field checkbox-field--compact">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Archived
            </label>
          </div>

          {filtered.length === 0 ? (
            <p className="placeholder-note">No exercises match your search.</p>
          ) : (
            <ul className="exercise-list">
              {filtered.map((exercise) => (
                <li key={exercise.id}>
                  <ExerciseCard exercise={exercise} to={`/exercises/${exercise.id}/edit`} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
