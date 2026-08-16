import { Link } from 'react-router-dom'
import type { WorkoutSession } from '../../types'
import { formatDateLong } from '../../utils/dates'

interface WorkoutHistoryCardProps {
  session: WorkoutSession
}

export function WorkoutHistoryCard({ session }: WorkoutHistoryCardProps) {
  return (
    <Link to={`/workouts/${session.id}`} className="workout-history-card">
      <div className="workout-history-card__header">
        <span className="workout-history-card__date">{formatDateLong(session.date)}</span>
        <span className="workout-history-card__title">{session.title}</span>
      </div>
      {session.notes && <p className="workout-history-card__notes">{session.notes}</p>}
    </Link>
  )
}
