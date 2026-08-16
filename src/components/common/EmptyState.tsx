import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {action}
    </section>
  )
}
