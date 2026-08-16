import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App shell', () => {
  it('renders the empty-state home screen and all nav tabs', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /start tracking your training/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument()
    for (const label of ['Home', 'Exercises', 'History', 'More']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
