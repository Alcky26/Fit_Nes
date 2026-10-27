import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Screens with a form the user may be typing into; never reloaded
 *  underneath them. */
function isOnFormScreen(): boolean {
  const hash = window.location.hash
  return hash.startsWith('#/log') || hash.includes('/entries/')
}

/**
 * Listens for messages from the service worker's notification handlers:
 *  - open an exercise's Add Entry form (tap on the notification), and
 *  - refresh when a set was saved straight from the notification while the
 *    app was in the background, so the screen never shows stale data.
 * Renders nothing.
 */
export function NotificationBridge() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    let refreshPending = false

    function refreshIfSafe() {
      if (!isOnFormScreen()) window.location.reload()
      refreshPending = false
    }

    function onMessage(event: MessageEvent) {
      const data: unknown = event.data
      if (!isRecord(data)) return
      if (data.type === 'ft-open-exercise' && typeof data.exerciseId === 'string') {
        navigate(`/log?exercise=${encodeURIComponent(data.exerciseId)}`)
      } else if (data.type === 'ft-data-changed') {
        if (document.visibilityState === 'visible') refreshIfSafe()
        else refreshPending = true
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible' && refreshPending) refreshIfSafe()
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
