import type { SetRecord, StatDefinition, StatValues } from '../../types'
import { StatValueInputs } from './StatValueInputs'

interface SetEditorProps {
  statDefs: StatDefinition[]
  usesSets: boolean
  value: SetRecord[]
  onChange: (sets: SetRecord[]) => void
}

export function SetEditor({ statDefs, usesSets, value, onChange }: SetEditorProps) {
  function updateSetValues(index: number, values: StatValues) {
    if (value.length === 0) {
      onChange([{ setNumber: index + 1, values }])
      return
    }
    onChange(value.map((set, i) => (i === index ? { ...set, values } : set)))
  }

  function addSet() {
    const last = value[value.length - 1]
    onChange([...value, { setNumber: value.length + 1, values: last ? { ...last.values } : {} }])
  }

  function removeSet(index: number) {
    onChange(value.filter((_, i) => i !== index).map((set, i) => ({ ...set, setNumber: i + 1 })))
  }

  if (!usesSets) {
    const single = value[0] ?? { setNumber: 1, values: {} }
    return <StatValueInputs statDefs={statDefs} values={single.values} onChange={(values) => updateSetValues(0, values)} />
  }

  return (
    <div className="set-editor">
      {value.map((set, index) => (
        <div key={set.setNumber} className="set-editor__row">
          <div className="set-editor__row-header">
            <span>Set {set.setNumber}</span>
            {value.length > 1 && (
              <button
                type="button"
                className="set-editor__remove"
                aria-label={`Remove set ${set.setNumber}`}
                onClick={() => removeSet(index)}
              >
                Remove
              </button>
            )}
          </div>
          <StatValueInputs statDefs={statDefs} values={set.values} onChange={(values) => updateSetValues(index, values)} />
        </div>
      ))}
      <button type="button" className="btn set-editor__add" onClick={addSet}>
        + Add Set
      </button>
    </div>
  )
}
