import { loadLastSet } from '../analytics/exerciseReference'
import type { Exercise } from '../types'
import { formatExerciseTargets, formatRestSeconds, formatStatValues } from '../utils/format'

const STORAGE_KEY = 'ft.workoutNotifications'
const NOTIFICATION_TAG = 'workout-current'
/** Rest timer length when an exercise has none set. Keep in sync with
 *  FT_DEFAULT_REST_SECONDS in public/notification-sw.js. */
export const DEFAULT_REST_SECONDS = 90

/** The Notification API's `actions` / `renotify` fields aren't in the
 *  standard DOM typings, but Chromium (Chrome, Edge) supports them. */
type WorkoutNotificationOptions = NotificationOptions & {
  actions?: { action: string; title: string }[]
  renotify?: boolean
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

/** Per-device preference (the browser's permission is per-device too), so
 *  it lives in localStorage and is deliberately not part of backups. */
export function isWorkoutNotificationEnabled(): boolean {
  if (!isNotificationSupported()) return false
  try {
    return localStorage.getItem(STORAGE_KEY) === '1' && Notification.permission === 'granted'
  } catch {
    return false
  }
}

export type EnableResult = 'enabled' | 'disabled' | 'denied' | 'unsupported'

/** Turns the feature on (asking for permission — must be called from a tap)
 *  or off. */
export async function setWorkoutNotificationEnabled(enabled: boolean): Promise<EnableResult> {
  if (!isNotificationSupported()) return 'unsupported'
  if (!enabled) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Preference just won't persist; nothing else to do.
    }
    await clearWorkoutNotification()
    return 'disabled'
  }

  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    return 'unsupported'
  }
  return 'enabled'
}

async function getRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  // getRegistration() resolves undefined when no service worker exists
  // (development builds, unsupported browsers) instead of hanging.
  return navigator.serviceWorker.getRegistration()
}

/** Shows (or replaces) the single "current exercise" notification with
 *  Repeat / Rest buttons. Best-effort: it never throws, because a failed
 *  reminder must not get in the way of logging a workout. */
export async function showWorkoutNotification(exercise: Exercise): Promise<void> {
  if (!isWorkoutNotificationEnabled()) return
  try {
    const registration = await getRegistration()
    if (!registration) return

    const lastSet = await loadLastSet(exercise.id)
    const lines: string[] = []
    if (lastSet) lines.push(`Last set: ${formatStatValues(exercise.statDefs, lastSet.values)}`)
    const targets = formatExerciseTargets(exercise)
    if (targets) lines.push(targets)

    const body = lines.join('\n') || 'Tap to log a set.'
    const restSeconds = exercise.restSeconds || DEFAULT_REST_SECONDS
    const options: WorkoutNotificationOptions = {
      body,
      tag: NOTIFICATION_TAG,
      renotify: false,
      silent: true,
      requireInteraction: true,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      actions: [
        { action: 'repeat', title: 'Repeat last set' },
        { action: 'timer', title: `Rest ${formatRestSeconds(restSeconds)}` },
      ],
      data: { kind: 'workout', exerciseId: exercise.id, exerciseName: exercise.name, restSeconds, body },
    }
    await registration.showNotification(exercise.name, options)
  } catch (error) {
    console.error('Could not show the workout notification', error)
  }
}

export async function clearWorkoutNotification(): Promise<void> {
  try {
    const registration = await getRegistration()
    if (!registration) return
    const open = await registration.getNotifications({ tag: NOTIFICATION_TAG })
    open.forEach((n) => n.close())
  } catch {
    // Nothing to clear.
  }
}
