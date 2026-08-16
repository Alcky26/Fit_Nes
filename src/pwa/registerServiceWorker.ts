// vite-plugin-pwa provides this virtual module at build time; it isn't a
// real file on disk (see src/vite-env.d.ts for the type reference that
// makes this resolve in the editor/type-checker).
import { registerSW } from 'virtual:pwa-register'

/**
 * Registers the service worker so the app shell is precached and the
 * core app — recording a workout above all — keeps working with no
 * network connection. autoUpdate means a new version takes over
 * silently on the next load rather than prompting; there's no
 * update-notification UI to wire it into, and staying current
 * automatically is the simpler, safer default for a single-user app.
 */
export function registerServiceWorker(): void {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true })
  }
}
