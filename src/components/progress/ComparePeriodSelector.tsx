import type { ComparePeriodSelection } from '../../analytics/exerciseProgress'
import { todayIso } from '../../utils/dates'
import { PROGRESS_PRESET_LABELS, type ProgressPreset } from '../../utils/periods'

const PRESET_ORDER: ProgressPreset[] = ['last7', 'last30', 'last2months', 'last6months', 'lastYear']

interface ComparePeriodSelectorProps {
  value: ComparePeriodSelection
  onChange: (next: ComparePeriodSelection) => void
}

export function ComparePeriodSelector({ value, onChange }: ComparePeriodSelectorProps) {
  return (
    <div className="compare-selector">
      <p className="eyebrow">Compare Progress</p>
      <div className="compare-selector__chips">
        {PRESET_ORDER.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`chip${value.kind === 'preset' && value.preset === preset ? ' chip--active' : ''}`}
            onClick={() => onChange({ kind: 'preset', preset })}
          >
            {PROGRESS_PRESET_LABELS[preset]}
          </button>
        ))}
        <button
          type="button"
          className={`chip${value.kind === 'allTime' ? ' chip--active' : ''}`}
          onClick={() => onChange({ kind: 'allTime' })}
        >
          All Time
        </button>
        <button
          type="button"
          className={`chip${value.kind === 'custom' ? ' chip--active' : ''}`}
          onClick={() => onChange({ kind: 'custom', range: { start: todayIso(), end: todayIso() } })}
        >
          Custom
        </button>
      </div>

      {value.kind === 'custom' && (
        <div className="compare-selector__custom">
          <div className="field">
            <label htmlFor="progress-start">Start date</label>
            <input
              id="progress-start"
              type="date"
              value={value.range.start}
              max={value.range.end}
              onChange={(e) => onChange({ kind: 'custom', range: { start: e.target.value, end: value.range.end } })}
            />
          </div>
          <div className="field">
            <label htmlFor="progress-end">End date</label>
            <input
              id="progress-end"
              type="date"
              value={value.range.end}
              min={value.range.start}
              max={todayIso()}
              onChange={(e) => onChange({ kind: 'custom', range: { start: value.range.start, end: e.target.value } })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
