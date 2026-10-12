import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Exercise } from '../../types'
import { ExercisePicker } from './ExercisePicker'

function ex(name: string, category: Exercise['category']): Exercise {
  return { id: name, name, category, description: '', photoId: null, statDefs: [], usesSets: true, archived: false, createdAt: 0, updatedAt: 0 }
}

const EXERCISES = [ex('Leg Press', 'legs'), ex('Incline Chest Press', 'chest'), ex('Chest Press', 'chest'), ex('Seated Row', 'back')]

function listedNames(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent ?? '')
}

describe('ExercisePicker search', () => {
  it('lists everything when the search is empty', () => {
    render(<ExercisePicker exercises={EXERCISES} onSelect={vi.fn()} />)
    expect(listedNames()).toEqual(['Leg Press', 'Incline Chest Press', 'Chest Press', 'Seated Row'])
  })

  it('filters and orders results by relevance while typing', () => {
    render(<ExercisePicker exercises={EXERCISES} onSelect={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'chest press' } })
    expect(listedNames()).toEqual(['Chest Press', 'Incline Chest Press'])
  })

  it('shows a message when nothing matches', () => {
    render(<ExercisePicker exercises={EXERCISES} onSelect={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'zzzz' } })
    expect(screen.getByText('No exercises match your search.')).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('selects the best match on Enter and a row on click', () => {
    const onSelect = vi.fn()
    render(<ExercisePicker exercises={EXERCISES} onSelect={onSelect} />)
    const input = screen.getByLabelText('Search exercises')
    fireEvent.change(input, { target: { value: 'chest' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(EXERCISES[2])

    fireEvent.click(screen.getByRole('button', { name: /Seated Row|Incline Chest Press/ }))
    expect(onSelect).toHaveBeenCalledTimes(2)
  })
})
