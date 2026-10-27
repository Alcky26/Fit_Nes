import { useState } from 'react'
import {
  isNotificationSupported,
  isWorkoutNotificationEnabled,
  setWorkoutNotificationEnabled,
} from '../../pwa/workoutNotification'

export function WorkoutNotificationSetting() {
  const [enabled, setEnabled] = useState(isWorkoutNotificationEnabled)
  const [message, setMessage] = useState<string | null>(null)

  if (!isNotificationSupported()) {
    return <p className="field__hint">This browser doesn't support notifications.</p>
  }

  async function handleChange(next: boolean) {
    const result = await setWorkoutNotificationEnabled(next)
    setEnabled(result === 'enabled')
    if (result === 'denied') {
      setMessage('Notifications are blocked. Allow them for this app in your browser or phone settings, then try again.')
    } else if (result === 'unsupported') {
      setMessage("Couldn't turn notifications on in this browser.")
    } else {
      setMessage(null)
    }
  }

  return (
    <>
      <p className="field__hint">
        While you train, a notification for your current exercise stays on your phone. <strong>Repeat last set</strong>{' '}
        saves the same set again without opening the app. The <strong>Rest</strong> button starts the rest timer
        (the exercise's rest time, or 1 min 30 s if none is set); while it runs you get <strong>Stop timer</strong> and{' '}
        <strong>+30 s</strong>, and when it ends the phone beeps and vibrates. Tap the notification to open the entry
        form. Works best with the installed app.
      </p>
      <label className="checkbox-field">
        <input type="checkbox" checked={enabled} onChange={(e) => void handleChange(e.target.checked)} />
        Show a workout notification
      </label>
      {message && <p className="field__hint field__hint--error">{message}</p>}
    </>
  )
}
