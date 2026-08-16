import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Exercise } from '../../types'
import { EntryForm } from './EntryForm'

const seatedRow: Exercise = {
  id: 'ex-1',
  name: 'Seated Row',
  category: 'back',
  description: '',
  photoId: null,
  usesSets: true,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
  statDefs: [
    { id: 'reps', type: 'reps', label: 'Repetitions', unit: null, direction: 'higherIsBetter', isText: false },
    { id: 'weight', type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter', isText: false },
  ],
}

const treadmill: Exercise = {
  id: 'ex-2',
  name: 'Treadmill',
  category: 'cardio',
  description: '',
  photoId: null,
  usesSets: false,
  archived: false,
  createdAt: 0,
  updatedAt: 0,
  statDefs: [{ id: 'duration', type: 'duration', label: 'Duration', unit: 'min', direction: 'higherIsBetter', isText: false }],
}

describe('EntryForm', () => {
  it('a strength exercise records each added set as its own numbered SetRecord', () => {
    const onSubmit = vi.fn()
    render(<EntryForm exercise={seatedRow} submitLabel="Save Entry" onSubmit={onSubmit} />)

    const [reps1, weight1] = screen.getAllByRole('spinbutton')
    fireEvent.change(reps1!, { target: { value: '12' } })
    fireEvent.change(weight1!, { target: { value: '30' } })

    fireEvent.click(screen.getByRole('button', { name: '+ Add Set' }))
    const [, , reps2, weight2] = screen.getAllByRole('spinbutton')
    fireEvent.change(reps2!, { target: { value: '10' } })
    fireEvent.change(weight2!, { target: { value: '35' } })

    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const values = onSubmit.mock.calls[0][0]
    expect(values.sets).toEqual([
      { setNumber: 1, values: { reps: 12, weight: 30 } },
      { setNumber: 2, values: { reps: 10, weight: 35 } },
    ])
  })

  it('removing a set renumbers the remaining ones', () => {
    const onSubmit = vi.fn()
    render(<EntryForm exercise={seatedRow} submitLabel="Save Entry" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: '+ Add Set' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Add Set' }))
    expect(screen.getAllByText(/^Set \d$/)).toHaveLength(3)

    fireEvent.click(screen.getByRole('button', { name: 'Remove set 2' }))
    expect(screen.getByText('Set 1')).toBeInTheDocument()
    expect(screen.getByText('Set 2')).toBeInTheDocument()
    expect(screen.queryByText('Set 3')).not.toBeInTheDocument()
  })

  it('a cardio exercise stores exactly one set with no set-number UI', () => {
    const onSubmit = vi.fn()
    render(<EntryForm exercise={treadmill} submitLabel="Save Entry" onSubmit={onSubmit} />)

    expect(screen.queryByRole('button', { name: '+ Add Set' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }))

    const values = onSubmit.mock.calls[0][0]
    expect(values.sets).toEqual([{ setNumber: 1, values: { duration: 10 } }])
  })

  it('disables submit and shows a hint when no value has been entered', () => {
    render(<EntryForm exercise={treadmill} submitLabel="Save Entry" onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Save Entry' })).toBeDisabled()
    expect(screen.getByText('Enter at least one value to save this entry.')).toBeInTheDocument()
  })

  it('with a fixedDate, the date input is not shown and the fixed date is submitted', () => {
    const onSubmit = vi.fn()
    render(<EntryForm exercise={treadmill} fixedDate="2026-08-01" submitLabel="Save Entry" onSubmit={onSubmit} />)

    expect(screen.queryByLabelText('Date')).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }))

    expect(onSubmit.mock.calls[0][0].date).toBe('2026-08-01')
  })
})
