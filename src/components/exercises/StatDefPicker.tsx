import { useState } from 'react'
import type { StatDefinition, StatDirection } from '../../types'
import {
  createCustomNumericStatDef,
  createCustomTextStatDef,
  createStatDefFromPreset,
  STAT_PRESETS,
  type StatPreset,
} from '../../utils/statPresets'

interface StatDefPickerProps {
  value: StatDefinition[]
  onChange: (defs: StatDefinition[]) => void
}

const DIRECTION_LABELS: Record<StatDirection, string> = {
  higherIsBetter: 'Higher is better',
  lowerIsBetter: 'Lower is better',
  neutral: 'Informational',
}

export function StatDefPicker({ value, onChange }: StatDefPickerProps) {
  const [customNumericOpen, setCustomNumericOpen] = useState(false)
  const [customTextOpen, setCustomTextOpen] = useState(false)

  const activeTypes = new Set(value.filter((d) => !d.isText && d.type !== 'customNumeric').map((d) => d.type))

  function togglePreset(preset: StatPreset) {
    if (activeTypes.has(preset.type)) {
      onChange(value.filter((d) => d.type !== preset.type))
    } else {
      onChange([...value, createStatDefFromPreset(preset)])
    }
  }

  function updateUnit(id: string, unit: string) {
    onChange(value.map((d) => (d.id === id ? { ...d, unit: unit || null } : d)))
  }

  function removeStat(id: string) {
    onChange(value.filter((d) => d.id !== id))
  }

  return (
    <div className="stat-picker">
      <p className="field__hint">Choose the statistics this exercise tracks.</p>

      <div className="stat-picker__chips">
        {STAT_PRESETS.map((preset) => (
          <button
            key={preset.type}
            type="button"
            className={`chip${activeTypes.has(preset.type) ? ' chip--active' : ''}`}
            onClick={() => togglePreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="stat-picker__custom-actions">
        <button type="button" className="btn" onClick={() => setCustomNumericOpen(true)}>
          + Custom numeric
        </button>
        <button type="button" className="btn" onClick={() => setCustomTextOpen(true)}>
          + Custom text
        </button>
      </div>

      {customNumericOpen && (
        <CustomNumericForm
          onCancel={() => setCustomNumericOpen(false)}
          onAdd={(label, unit, direction) => {
            onChange([...value, createCustomNumericStatDef(label, unit, direction)])
            setCustomNumericOpen(false)
          }}
        />
      )}
      {customTextOpen && (
        <CustomTextForm
          onCancel={() => setCustomTextOpen(false)}
          onAdd={(label) => {
            onChange([...value, createCustomTextStatDef(label)])
            setCustomTextOpen(false)
          }}
        />
      )}

      {value.length > 0 && (
        <ul className="stat-picker__list">
          {value.map((def) => (
            <li key={def.id} className="stat-row">
              <div className="stat-row__main">
                <span className="stat-row__label">{def.label}</span>
                {!def.isText && <span className="stat-row__direction">{DIRECTION_LABELS[def.direction]}</span>}
              </div>
              {!def.isText && (
                <input
                  className="stat-row__unit"
                  aria-label={`Unit for ${def.label}`}
                  value={def.unit ?? ''}
                  placeholder="unit"
                  onChange={(event) => updateUnit(def.id, event.target.value)}
                />
              )}
              <button
                type="button"
                className="stat-row__remove"
                aria-label={`Remove ${def.label}`}
                onClick={() => removeStat(def.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CustomNumericForm({
  onAdd,
  onCancel,
}: {
  onAdd: (label: string, unit: string | null, direction: StatDirection) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState('')
  const [unit, setUnit] = useState('')
  const [direction, setDirection] = useState<StatDirection>('higherIsBetter')

  return (
    <div className="inline-form">
      <input placeholder="Stat name (e.g. Grip strength)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <input placeholder="Unit (optional)" value={unit} onChange={(e) => setUnit(e.target.value)} />
      <select value={direction} onChange={(e) => setDirection(e.target.value as StatDirection)}>
        <option value="higherIsBetter">Higher is better</option>
        <option value="lowerIsBetter">Lower is better</option>
        <option value="neutral">Informational only</option>
      </select>
      <div className="inline-form__actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!label.trim()}
          onClick={() => onAdd(label.trim(), unit.trim() || null, direction)}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function CustomTextForm({ onAdd, onCancel }: { onAdd: (label: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('')
  return (
    <div className="inline-form">
      <input placeholder="Field name (e.g. Form cue)" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="inline-form__actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn--primary" disabled={!label.trim()} onClick={() => onAdd(label.trim())}>
          Add
        </button>
      </div>
    </div>
  )
}
