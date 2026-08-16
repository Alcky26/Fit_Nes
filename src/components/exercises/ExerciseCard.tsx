import { Link } from 'react-router-dom'
import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import type { Exercise } from '../../types'
import { categoryLabel } from '../../utils/categories'

interface ExerciseCardProps {
  exercise: Exercise
  to: string
}

export function ExerciseCard({ exercise, to }: ExerciseCardProps) {
  const photoUrl = usePhotoUrl(exercise.photoId)

  return (
    <Link to={to} className="exercise-card">
      <div className="exercise-card__thumb" aria-hidden="true">
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <span className="exercise-card__thumb-fallback">{exercise.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      <div className="exercise-card__body">
        <h3>{exercise.name}</h3>
        <p className="eyebrow">
          {categoryLabel(exercise.category)}
          {exercise.archived ? ' · Archived' : ''}
        </p>
      </div>
    </Link>
  )
}
