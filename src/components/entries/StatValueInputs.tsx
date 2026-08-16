import type { StatDefinition, StatValues } from '../../types'

interface StatValueInputsProps {
  statDefs: StatDefinition[]
  values: StatValues
  onChange: (values: StatValues) => void
}

export function StatValueInputs({ statDefs, values, onChange }: StatValueInputsProps) {
  function updateValue(statId: string, raw: string, isText: boolean) {
    if (isText) {
      onChange({ ...values, [statId]: raw })
      return
    }
    if (raw === '') {
      const next = { ...values }
      delete next[statId]
      onChange(next)
      return
    }
    const parsed = Number(raw)
    onChange({ ...values, [statId]: Number.isNaN(parsed) ? raw : parsed })
  }

  return (
    <div className="stat-value-grid">
      {statDefs.map((def) => (
        <label key={def.id} className="stat-value-field">
          <span className="stat-value-field__label">{def.label}</span>
          <span className="stat-value-field__input-row">
            <input
              type={def.isText ? 'text' : 'number'}
              inputMode={def.isText ? undefined : 'decimal'}
              step={def.isText ? undefined : 'any'}
              value={values[def.id] ?? ''}
              onChange={(event) => updateValue(def.id, event.target.value, def.isText)}
            />
            {def.unit && <span className="stat-value-field__unit">{def.unit}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}
