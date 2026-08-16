import { useEffect } from 'react'
import { settingsRepository } from '../repositories'
import type { ThemeMode } from '../types'
import { applyTheme } from './theme'

/**
 * Applies the effective color theme on mount: a persisted manual choice
 * from Settings takes priority; otherwise it follows OS preference (the
 * 'system' default). When Settings changes the theme, it calls
 * applyTheme() directly for an instant update — this hook only needs to
 * run once, plus react to OS-level changes while the setting is 'system'.
 */
export function useSystemTheme() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')
    let manualMode: ThemeMode = 'system'

    function reapply() {
      applyTheme(manualMode)
    }

    media.addEventListener('change', reapply)
    settingsRepository.get().then((settings) => {
      manualMode = settings.theme
      reapply()
    })

    return () => media.removeEventListener('change', reapply)
  }, [])
}
