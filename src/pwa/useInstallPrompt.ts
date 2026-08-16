import { useEffect, useState } from 'react'

/** beforeinstallprompt isn't part of the standard DOM lib typings (it's
 *  Chromium-specific and never became a cross-browser standard), so it's
 *  declared locally rather than reaching for `any`. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface UseInstallPromptResult {
  /** True once the browser has fired beforeinstallprompt and it hasn't
   *  been used yet — only Chromium browsers support this. */
  canInstall: boolean
  /** True once installed, including a returning visit already running
   *  in standalone display mode (not just an install during this
   *  session). */
  installed: boolean
  promptInstall: () => Promise<void>
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredEvent(event as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setInstalled(true)
      setDeferredEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function promptInstall() {
    if (!deferredEvent) return
    await deferredEvent.prompt()
    const choice = await deferredEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setDeferredEvent(null)
  }

  return { canInstall: deferredEvent !== null, installed, promptInstall }
}
