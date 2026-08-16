import { describe, expect, it } from 'vitest'
import {
  createCustomNumericStatDef,
  createCustomTextStatDef,
  createStatDefFromPreset,
  STAT_PRESETS,
} from './statPresets'

describe('statPresets', () => {
  it('every preset produces a non-text stat definition with a unique id', () => {
    const defs = STAT_PRESETS.map(createStatDefFromPreset)
    const ids = new Set(defs.map((d) => d.id))

    expect(ids.size).toBe(defs.length)
    for (const def of defs) {
      expect(def.isText).toBe(false)
    }
  })

  it('creates a custom numeric stat with the given unit and direction', () => {
    const def = createCustomNumericStatDef('Grip strength', 'kg', 'higherIsBetter')
    expect(def).toMatchObject({
      type: 'customNumeric',
      label: 'Grip strength',
      unit: 'kg',
      direction: 'higherIsBetter',
      isText: false,
    })
  })

  it('creates a custom text stat that is always neutral and unitless', () => {
    const def = createCustomTextStatDef('Form cue')
    expect(def).toMatchObject({ type: 'customText', label: 'Form cue', unit: null, direction: 'neutral', isText: true })
  })
})
