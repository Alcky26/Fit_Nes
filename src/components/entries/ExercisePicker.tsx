import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import type { Exercise } from '../../types'
import { categoryLabel } from '../../utils/categories'
import { searchExercises } from '../../utils/exerciseSearch'

interface ExercisePickerProps {
  exercises: Exercise[]
  onSelect: (exercise: Exercise) => void
}

export function ExercisePicker({ exercises, onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchExercises(exercises, query), [exercises, query])
  const searching = query.trim().length > 0

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter picks the best match, so you can type and confirm without
    // touching the list.
    if (event.key === 'Enter') {
      event.preventDefault()
      const top = results[0]
      if (top) onSelect(top)
    }
  }

  return (
    <div className="exercise-picker">
      <div className="field">
        <label htmlFor="exercise-search">Search exercises</label>
        <input
          id="exercise-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. chest press"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {searching && (
          <p className="field__hint" role="status">
            {results.length === 0 ? 'No exercises match your search.' : `${results.length} of ${exercises.length} exercises, best match first`}
          </p>
        )}
      </div>

      <ul className="exercise-list">
        {results.map((exercise) => (
          <li key={exercise.id}>
            <ExercisePickerRow exercise={exercise} onSelect={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ExercisePickerRow({ exercise, onSelect }: { exercise: Exercise; onSelect: (exercise: Exercise) => void }) {
  const photoUrl = usePhotoUrl(exercise.photoId)
  return (
    <button type="button" className="exercise-card exercise-card--button" onClick={() => onSelect(exercise)}>
      <div className="exercise-card__thumb" aria-hidden="true">
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <span className="exercise-card__thumb-fallback">{exercise.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="exercise-card__body">
        <h3>{exercise.name}</h3>
        <p className="eyebrow">{categoryLabel(exercise.category)}</p>
      </div>
    </button>
  )
}
