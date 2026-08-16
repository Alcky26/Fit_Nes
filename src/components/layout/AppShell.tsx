import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  )
}
