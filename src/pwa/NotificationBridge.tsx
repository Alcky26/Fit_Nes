import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { playBeep } from './beep'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Forms where something is being edited or created from scratch; the
 *  screen is never replaced underneath them. */
function isOnEditForm(): boolean {
  const hash = window.location.hash
  return hash.includes('/edit') || hash.includes('/exercises/new')
}

/** The Add Entry screens. A set saved from the notification makes them
 *  redundant, so they are swapped for the workout it landed in. */
function isOnNewEntryScreen(): boolean {
  const hash = window.location.hash
  return hash.startsWith('#/log') || hash.includes('/entries/new')
}

/**
 * Listens for messages from the service worker's notification handlers:
 *  - a set was saved from the notification → show the up-to-date data;
 *  - the rest timer ended → beep, if the app is on screen.
 * Renders nothing.
 */
export function NotificationBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let pending: { sessionId: string | null } | null = null

    function refresh(sessionId: string | null) {
      pending = null
      if (isOnEditForm()) return
      if (isOnNewEntryScreen() && sessionId) {
        navigate(`/workouts/${sessionId}`)
        return
      }
      window.location.reload()
    }

    function onMessage(event: MessageEvent) {
      const data: unknown = event.data
      if (!isRecord(data)) return
      if (data.type === 'ft-data-changed') {
        const sessionId = typeof data.sessionId === 'string' ? data.sessionId : null
        if (document.visibilityState === 'visible') refresh(sessionId)
        else pending = { sessionId }
      } else if (data.type === 'ft-timer-done') {
        if (document.visibilityState === 'visible') playBeep()
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible' && pending) refresh(pending.sessionId)
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [navigate])

  return null
}
