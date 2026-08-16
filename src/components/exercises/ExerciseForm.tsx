import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Exercise, ExerciseCategory, StatDefinition } from '../../types'
import { CATEGORY_OPTIONS } from '../../utils/categories'
import { TextArea } from '../common/TextArea'
import { TextField } from '../common/TextField'
import { PhotoField, type PhotoState } from './PhotoField'
import { StatDefPicker } from './StatDefPicker'

export interface ExerciseFormValues {
  name: string
  category: ExerciseCategory
  description: string
  usesSets: boolean
  statDefs: StatDefinition[]
  photo: PhotoState
}

interface ExerciseFormProps {
  initial?: Exercise
  submitLabel: string
  busy?: boolean
  onSubmit: (values: ExerciseFormValues) => void | Promise<void>
}

export function ExerciseForm({ initial, submitLabel, busy, onSubmit }: ExerciseFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<ExerciseCategory>(initial?.category ?? 'other')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [usesSets, setUsesSets] = useState(initial?.usesSets ?? false)
  const [statDefs, setStatDefs] = useState<StatDefinition[]>(initial?.statDefs ?? [])
  const [photo, setPhoto] = useState<PhotoState>(
    initial?.photoId ? { kind: 'existing', photoId: initial.photoId } : { kind: 'none' },
  )

  const canSubmit = name.trim().length > 0 && statDefs.length > 0 && !busy

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ name: name.trim(), category, description: description.trim(), usesSets, statDefs, photo })
  }

  return (
    <form className="exercise-form" onSubmit={handleSubmit}>
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treadmill" required />

      <div className="field">
        <label htmlFor="exercise-category">Category</label>
        <select
          id="exercise-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <TextArea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional notes about form, machine settings, etc."
      />

      <PhotoField value={photo} onChange={setPhoto} />

      <label className="checkbox-field">
        <input type="checkbox" checked={usesSets} onChange={(e) => setUsesSets(e.target.checked)} />
        Track multiple sets (e.g. 12 reps × 30 kg, then set 2, set 3…)
      </label>

      <StatDefPicker value={statDefs} onChange={setStatDefs} />
      {statDefs.length === 0 && <p className="field__hint field__hint--error">Choose at least one statistic to track.</p>}

      <button type="submit" className="btn btn--primary btn--lg" disabled={!canSubmit}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
