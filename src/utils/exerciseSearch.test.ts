import { describe, expect, it } from 'vitest'
import type { Exercise, ExerciseCategory } from '../types'
import { editDistance, searchExercises, tokenize } from './exerciseSearch'

function ex(name: string, category: ExerciseCategory = 'other', description = ''): Exercise {
  return {
    id: name,
    name,
    category,
    description,
    photoId: null,
    statDefs: [],
    usesSets: true,
    archived: false,
    createdAt: 0,
    updatedAt: 0,
  }
}

const LIBRARY = [
  ex('Incline Chest Press', 'chest'),
  ex('Chest Press', 'chest'),
  ex('Seated Row', 'back'),
  ex('Leg Press', 'legs'),
  ex('Lat Pulldown', 'back', 'wide grip'),
  ex('Shoulder Press', 'shoulders'),
  ex('Treadmill', 'cardio'),
  ex('Pec Fly', 'chest'),
]

const names = (list: Exercise[]) => list.map((e) => e.name)

describe('tokenize', () => {
  it('lowercases, strips accents and splits on punctuation', () => {
    expect(tokenize('Chést-Press  (Machine)')).toEqual(['chest', 'press', 'machine'])
  })
})

describe('editDistance', () => {
  it('computes distance and bails out past the max', () => {
    expect(editDistance('chest', 'chest', 2)).toBe(0)
    expect(editDistance('chset', 'chest', 2)).toBe(1) // swapped letters = one typo
    expect(editDistance('chast', 'chest', 2)).toBe(1)
    expect(editDistance('abc', 'xyzxyz', 1)).toBe(2)
  })
})

describe('searchExercises', () => {
  it('returns the list unchanged for an empty or blank query', () => {
    expect(searchExercises(LIBRARY, '')).toBe(LIBRARY)
    expect(searchExercises(LIBRARY, '   ')).toBe(LIBRARY)
  })

  it('ranks the exact name first, then names starting with the query', () => {
    expect(names(searchExercises(LIBRARY, 'chest press'))).toEqual(['Chest Press', 'Incline Chest Press'])
  })

  it('ranks name matches above category and description matches', () => {
    const results = names(searchExercises(LIBRARY, 'press'))
    expect(results.slice(0, 4).sort()).toEqual(['Chest Press', 'Incline Chest Press', 'Leg Press', 'Shoulder Press'].sort())
    const chest = names(searchExercises(LIBRARY, 'chest'))
    expect(chest[0]).toBe('Chest Press') // name hit with the shorter name
    expect(chest).toContain('Pec Fly') // category hit
    expect(chest.indexOf('Pec Fly')).toBeGreaterThan(chest.indexOf('Incline Chest Press'))
  })

  it('matches prefixes as you type', () => {
    expect(names(searchExercises(LIBRARY, 'tread'))).toEqual(['Treadmill'])
    expect(names(searchExercises(LIBRARY, 'sho'))).toEqual(['Shoulder Press'])
  })

  it('requires every word to match, in any order', () => {
    expect(names(searchExercises(LIBRARY, 'press leg'))).toEqual(['Leg Press'])
    expect(searchExercises(LIBRARY, 'leg treadmill')).toEqual([])
  })

  it('tolerates small typos and missing accents', () => {
    expect(names(searchExercises(LIBRARY, 'chset press'))[0]).toBe('Chest Press')
    expect(names(searchExercises(LIBRARY, 'treadmil'))).toEqual(['Treadmill'])
  })

  it('finds exercises through their category or description', () => {
    expect(names(searchExercises(LIBRARY, 'back'))).toEqual(['Lat Pulldown', 'Seated Row'])
    expect(names(searchExercises(LIBRARY, 'wide'))).toEqual(['Lat Pulldown'])
  })

  it('returns nothing when nothing is similar', () => {
    expect(searchExercises(LIBRARY, 'zzzz')).toEqual([])
  })
})
