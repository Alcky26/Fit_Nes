import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExerciseForm } from './ExerciseForm'

describe('ExerciseForm', () => {
  it('submits a new exercise with the selected statistics', () => {
    const onSubmit = vi.fn()
    render(<ExerciseForm submitLabel="Add Exercise" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Treadmill' } })
    fireEvent.click(screen.getByRole('button', { name: 'Duration' }))
    fireEvent.click(screen.getByRole('button', { name: 'Speed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Incline' }))

    fireEvent.click(screen.getByRole('button', { name: 'Add Exercise' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const values = onSubmit.mock.calls[0][0]
    expect(values.name).toBe('Treadmill')
    expect(values.statDefs.map((d: { label: string }) => d.label).sort()).toEqual(['Duration', 'Incline', 'Speed'])
    expect(values.photo).toEqual({ kind: 'none' })
  })

  it('toggling a stat chip twice removes it again', () => {
    const onSubmit = vi.fn()
    render(<ExerciseForm submitLabel="Add Exercise" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Plank' } })
    const durationChip = screen.getByRole('button', { name: 'Duration' })
    fireEvent.click(durationChip)
    fireEvent.click(durationChip)

    // No statistic selected, so submit stays disabled and the hint shows.
    expect(screen.getByRole('button', { name: 'Add Exercise' })).toBeDisabled()
    expect(screen.getByText('Choose at least one statistic to track.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables submit until a name and at least one statistic are set', () => {
    render(<ExerciseForm submitLabel="Add Exercise" onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add Exercise' })).toBeDisabled()
  })
})
