import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import type { Exercise } from '../../types'
import { categoryLabel } from '../../utils/categories'

interface ExercisePickerProps {
  exercises: Exercise[]
  onSelect: (exercise: Exercise) => void
}

export function ExercisePicker({ exercises, onSelect }: ExercisePickerProps) {
  return (
    <ul className="exercise-list">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <ExercisePickerRow exercise={exercise} onSelect={onSelect} />
        </li>
      ))}
    </ul>
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
