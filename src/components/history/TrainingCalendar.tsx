import { useNavigate } from 'react-router-dom'
import { getCalendarGridDates } from '../../utils/periods'
import { todayIso } from '../../utils/dates'

interface TrainingCalendarProps {
  year: number
  month: number // 1-12
  trainingDates: Set<string>
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function TrainingCalendar({ year, month, trainingDates }: TrainingCalendarProps) {
  const navigate = useNavigate()
  const cells = getCalendarGridDates(year, month)
  const today = todayIso()

  return (
    <div className="training-calendar">
      <div className="training-calendar__weekdays">
        {WEEKDAY_HEADERS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="training-calendar__grid">
        {cells.map((date, index) => {
          if (!date) return <span key={`blank-${index}`} className="training-calendar__cell training-calendar__cell--blank" />
          const isTraining = trainingDates.has(date)
          const isToday = date === today
          return (
            <button
              key={date}
              type="button"
              className={`training-calendar__cell${isTraining ? ' training-calendar__cell--training' : ''}${isToday ? ' training-calendar__cell--today' : ''}`}
              onClick={() => navigate(`/stats/daily/${date}`)}
              aria-label={`${date}${isTraining ? ', training day' : ''}`}
            >
              {Number(date.slice(-2))}
              {isTraining && <span className="training-calendar__dot" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
