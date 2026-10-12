import type { Exercise } from '../types'
import { categoryLabel } from './categories'

/** Lowercases, strips accents and splits on anything that isn't a letter
 *  or digit, so "Chest-Press", "chest press" and "Chést Press" all
 *  produce the same tokens. */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
}

/** Edit distance where swapping two adjacent letters ("chset" → "chest")
 *  counts as one typo, giving up early once it exceeds `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const rows: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    const row: number[] = []
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) row.push(j)
      else if (j === 0) row.push(i)
      else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        let value = Math.min((rows[i - 1]?.[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (rows[i - 1]?.[j - 1] ?? 0) + cost)
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          value = Math.min(value, (rows[i - 2]?.[j - 2] ?? 0) + 1)
        }
        row.push(value)
      }
    }
    rows.push(row)
  }
  return rows[a.length]?.[b.length] ?? max + 1
}

/** How many typos a query word of this length may contain and still match. */
function allowedTypos(length: number): number {
  if (length >= 7) return 2
  if (length >= 4) return 1
  return 0
}

// Relative weights: a name hit always beats a category hit, which always
// beats a description hit, so the most pertinent results come first.
const SCORE = {
  nameWordExact: 600,
  nameWordPrefix: 450,
  nameSubstring: 300,
  nameTypo: 200,
  category: 120,
  descriptionWord: 60,
} as const

/** Best score of one query word against one exercise, or 0 if none. */
function scoreToken(token: string, nameWords: string[], categoryWords: string[], descriptionWords: string[]): number {
  let best = 0
  nameWords.forEach((word, index) => {
    // Earlier words in the name count slightly more ("Press" in
    // "Press Chest" beats "Press" in "Chest Machine Press").
    const positionBonus = Math.max(0, 20 - index * 5)
    let score = 0
    if (word === token) score = SCORE.nameWordExact
    else if (word.startsWith(token)) score = SCORE.nameWordPrefix
    else if (token.length >= 3 && word.includes(token)) score = SCORE.nameSubstring
    else {
      const typos = allowedTypos(token.length)
      if (typos > 0) {
        // Compare against the same-length prefix too, so a half-typed
        // word with a typo ("chset") still finds "chest".
        const prefix = word.slice(0, token.length)
        if (editDistance(token, word, typos) <= typos || editDistance(token, prefix, typos) <= typos) {
          score = SCORE.nameTypo
        }
      }
    }
    if (score > 0) best = Math.max(best, score + positionBonus)
  })

  if (categoryWords.some((w) => w.startsWith(token))) best = Math.max(best, SCORE.category)
  if (descriptionWords.some((w) => w.startsWith(token))) best = Math.max(best, SCORE.descriptionWord)
  return best
}

/** Relevance of an exercise to the query; 0 means "doesn't match". Every
 *  query word must match somewhere (name, category or description). */
export function scoreExercise(exercise: Exercise, query: string): number {
  const tokens = tokenize(query)
  if (tokens.length === 0) return 0

  const nameWords = tokenize(exercise.name)
  const categoryWords = tokenize(categoryLabel(exercise.category))
  const descriptionWords = tokenize(exercise.description)

  let total = 0
  for (const token of tokens) {
    const score = scoreToken(token, nameWords, categoryWords, descriptionWords)
    if (score === 0) return 0
    total += score
  }

  // Whole-name bonuses so "chest press" ranks "Chest Press" above
  // "Incline Chest Press" and an exact name above everything.
  const normalizedName = nameWords.join(' ')
  const normalizedQuery = tokens.join(' ')
  if (normalizedName === normalizedQuery) total += 1000
  else if (normalizedName.startsWith(normalizedQuery)) total += 300
  else if (normalizedName.includes(normalizedQuery)) total += 150

  // Prefer shorter names when otherwise equal (closer match to the query).
  return total - Math.min(nameWords.length, 10)
}

/** Returns the matching exercises ordered best-first. An empty query
 *  returns the list unchanged (callers keep their own ordering). */
export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  if (tokenize(query).length === 0) return exercises
  return exercises
    .map((exercise) => ({ exercise, score: scoreExercise(exercise, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
    .map((item) => item.exercise)
}
