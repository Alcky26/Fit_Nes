import type { ThemeMode } from '../types'

/** Sets <html data-theme> from an explicit mode, resolving 'system' to
 *  the current OS preference. theme.css keys every color off this
 *  attribute (default :root = dark). Called both on startup (see
 *  useSystemTheme) and immediately when Settings changes the theme, so
 *  the UI updates without needing a reload. */
export function applyTheme(mode: ThemeMode): void {
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  const effective = mode === 'system' ? (prefersLight ? 'light' : 'dark') : mode
  document.documentElement.dataset.theme = effective
}
