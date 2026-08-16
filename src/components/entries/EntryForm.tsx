import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Exercise, SetRecord } from '../../types'
import { todayIso } from '../../utils/dates'
import { TextArea } from '../common/TextArea'
import { SetEditor } from './SetEditor'

export interface EntryFormValues {
  date: string
  sets: SetRecord[]
  notes: string
}

interface EntryFormProps {
  exercise: Exercise
  initial?: EntryFormValues
  /** When set, the entry belongs to an existing session and its date is
   *  fixed to that session's date (shown read-only) rather than editable —
   *  changing a workout's date happens at the session level and cascades
   *  to its entries, see SessionDetailPage. */
  fixedDate?: string
  submitLabel: string
  busy?: boolean
  onSubmit: (values: EntryFormValues) => void | Promise<void>
}

export function EntryForm({ exercise, initial, fixedDate, submitLabel, busy, onSubmit }: EntryFormProps) {
  const [date, setDate] = useState(initial?.date ?? fixedDate ?? todayIso())
  const [sets, setSets] = useState<SetRecord[]>(initial?.sets ?? [{ setNumber: 1, values: {} }])
  const [notes, setNotes] = useState(initial?.notes ?? '')

  const hasAnyValue = sets.some((set) => Object.keys(set.values).length > 0)
  const canSubmit = hasAnyValue && !busy

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ date: fixedDate ?? date, sets, notes: notes.trim() })
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      {fixedDate ? (
        <p className="field__hint">Logging for {fixedDate}</p>
      ) : (
        <div className="field">
          <label htmlFor="entry-date">Date</label>
          <input id="entry-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} required />
        </div>
      )}

      <SetEditor statDefs={exercise.statDefs} usesSets={exercise.usesSets} value={sets} onChange={setSets} />
      {!hasAnyValue && <p className="field__hint field__hint--error">Enter at least one value to save this entry.</p>}

      <TextArea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes for this exercise"
      />

      <button type="submit" className="btn btn--primary btn--lg" disabled={!canSubmit}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
