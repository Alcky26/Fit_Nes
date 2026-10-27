import { beforeEach, describe, expect, it, vi } from 'vitest'
import swSource from '../../public/notification-sw.js?raw'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { resetDatabase } from '../test/resetDatabase'
import type { Exercise } from '../types'
import { todayIso } from '../utils/dates'

type RepeatResult = { status: 'saved'; setNumber: number; summary: string } | { status: 'nothing' }

/** Loads the real service-worker script into a fake worker scope so its
 *  data logic runs against fake-indexeddb exactly as shipped. */
function loadServiceWorkerScript() {
  const scope = {
    addEventListener: vi.fn(),
    registration: {},
    clients: {},
    ftWorkoutNotification: undefined as undefined | { repeatLastSet: (id: string) => Promise<RepeatResult> },
  }
  new Function('self', 'indexedDB', 'crypto', swSource)(scope, indexedDB, crypto)
  return scope
}

beforeEach(async () => {
  await resetDatabase()
})

async function createExercise(usesSets: boolean): Promise<Exercise> {
  return exerciseRepository.create({
    name: 'Chest Press',
    category: 'chest',
    description: '',
    photoId: null,
    usesSets,
    statDefs: [
      { id: 'reps', type: 'reps', label: 'Repetitions', unit: null, direction: 'higherIsBetter', isText: false },
      { id: 'weight', type: 'weight', label: 'Weight', unit: 'kg', direction: 'higherIsBetter', isText: false },
    ],
  })
}

async function addEntry(exercise: Exercise, date: string, sets: { reps: number; weight: number }[]) {
  const session =
    (await sessionRepository.listByDate(date))[0] ??
    (await sessionRepository.create({ date, startTime: null, endTime: null, title: 'W', notes: '' }))
  return entryRepository.create({
    sessionId: session.id,
    exerciseId: exercise.id,
    date,
    notes: '',
    sets: sets.map((values, i) => ({ setNumber: i + 1, values })),
  })
}

describe('notification service worker: repeat last set', () => {
  it('registers a notificationclick handler', () => {
    const scope = loadServiceWorkerScript()
    expect(scope.addEventListener).toHaveBeenCalledWith('notificationclick', expect.any(Function))
  })

  it('does nothing when the exercise has no history', async () => {
    const exercise = await createExercise(true)
    const result = await loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet(exercise.id)
    expect(result).toEqual({ status: 'nothing' })
  })

  it("appends a copy of the last set to today's entry", async () => {
    const exercise = await createExercise(true)
    const entry = await addEntry(exercise, todayIso(), [
      { reps: 15, weight: 29 },
      { reps: 16, weight: 29 },
    ])

    const result = await loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet(exercise.id)
    expect(result).toEqual({ status: 'saved', setNumber: 3, summary: '16 · 29kg' })

    const saved = await entryRepository.get(entry.id)
    expect(saved?.sets).toHaveLength(3)
    expect(saved?.sets[2]).toEqual({ setNumber: 3, values: { reps: 16, weight: 29 } })
  })

  it('creates a new entry in a new session today when only older history exists', async () => {
    const exercise = await createExercise(true)
    await addEntry(exercise, '2020-01-01', [{ reps: 10, weight: 36 }])

    const result = await loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet(exercise.id)
    expect(result).toEqual({ status: 'saved', setNumber: 1, summary: '10 · 36kg' })

    const todays = await sessionRepository.listByDate(todayIso())
    expect(todays).toHaveLength(1)
    const entries = (await entryRepository.listByExercise(exercise.id)).filter((e) => e.date === todayIso())
    expect(entries).toHaveLength(1)
    expect(entries[0]?.sessionId).toBe(todays[0]?.id)
    expect(entries[0]?.sets).toEqual([{ setNumber: 1, values: { reps: 10, weight: 36 } }])
  })

  it("reuses today's existing session for a different exercise", async () => {
    const other = await createExercise(true)
    const exercise = await createExercise(true)
    await addEntry(other, todayIso(), [{ reps: 8, weight: 20 }])
    await addEntry(exercise, '2020-01-01', [{ reps: 10, weight: 36 }])

    await loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet(exercise.id)
    expect(await sessionRepository.listByDate(todayIso())).toHaveLength(1)
  })

  it('adds a separate entry for exercises that do not use sets', async () => {
    const exercise = await createExercise(false)
    await addEntry(exercise, todayIso(), [{ reps: 12, weight: 30 }])

    await loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet(exercise.id)
    const entries = await entryRepository.listByExercise(exercise.id)
    expect(entries).toHaveLength(2)
  })

  it('fails without creating a database when the app was never opened', async () => {
    await resetDatabase() // deletes the database
    await expect(loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet('x')).rejects.toBeDefined()
  })
})

describe('notification service worker: rest timer', () => {
  const DATA = { kind: 'workout', exerciseId: 'e1', exerciseName: 'Chest Press', restSeconds: 90, body: 'Last set: 16 · 29kg' }

  function setup() {
    const shown: { title: string; options: Record<string, unknown> }[] = []
    const scope = {
      addEventListener: vi.fn(),
      registration: {
        showNotification: vi.fn(async (title: string, options: Record<string, unknown>) => {
          shown.push({ title, options })
        }),
      },
      clients: { matchAll: vi.fn(async () => []), openWindow: vi.fn() },
    }
    new Function('self', 'indexedDB', 'crypto', swSource)(scope, indexedDB, crypto)
    const call = scope.addEventListener.mock.calls.find((c) => c[0] === 'notificationclick')
    const listener = call?.[1] as (event: unknown) => void
    const waiting: Promise<unknown>[] = []
    function click(action: string, data: Record<string, unknown> = DATA) {
      listener({ action, notification: { data, close: vi.fn() }, waitUntil: (p: Promise<unknown>) => waiting.push(p) })
    }
    const last = () => shown[shown.length - 1]!
    const actionIds = () => (last().options.actions as { action: string }[]).map((a) => a.action)
    return { click, shown, last, actionIds, waiting }
  }

  it('starts the timer, swaps the buttons, and beeps when it ends', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      t.click('timer')
      await vi.advanceTimersByTimeAsync(0)
      expect(t.last().options.body).toMatch(/^Resting until/)
      expect(t.actionIds()).toEqual(['timer-stop', 'timer-add'])
      expect(t.last().options.silent).toBe(true)

      await vi.advanceTimersByTimeAsync(89_000)
      expect(t.shown).toHaveLength(1) // still resting

      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.all(t.waiting)
      expect(t.last().options.body).toBe('Rest over — time for the next set.')
      expect(t.last().options.silent).toBe(false)
      expect(t.last().options.renotify).toBe(true)
      expect(t.last().options.vibrate).toEqual([200, 100, 200])
      expect(t.actionIds()).toEqual(['repeat', 'timer'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('labels the idle button with the exercise rest time and defaults to 90 s', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      t.click('timer', { ...DATA, restSeconds: 45 })
      await vi.advanceTimersByTimeAsync(44_000)
      expect(t.shown).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.all(t.waiting)
      const actions = t.last().options.actions as { action: string; title: string }[]
      expect(actions[1]?.title).toBe('Rest 45 s')

      t.click('timer', { ...DATA, restSeconds: undefined })
      await vi.advanceTimersByTimeAsync(89_000)
      expect(t.last().options.body).not.toBe('Rest over — time for the next set.')
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.all(t.waiting)
      expect(t.last().options.body).toBe('Rest over — time for the next set.')
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops the timer without beeping and restores the last-set text', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      t.click('timer')
      await vi.advanceTimersByTimeAsync(0)
      const runningData = t.last().options.data as Record<string, unknown>
      t.click('timer-stop', runningData)
      await vi.advanceTimersByTimeAsync(0)
      expect(t.last().options.body).toBe('Last set: 16 · 29kg')
      expect(t.actionIds()).toEqual(['repeat', 'timer'])

      const shownCount = t.shown.length
      await vi.advanceTimersByTimeAsync(120_000)
      expect(t.shown).toHaveLength(shownCount) // no beep after stopping
    } finally {
      vi.useRealTimers()
    }
  })

  it('adds 30 seconds to a running timer', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      t.click('timer')
      await vi.advanceTimersByTimeAsync(60_000)
      const runningData = t.last().options.data as Record<string, unknown>
      t.click('timer-add', runningData) // 30 s left + 30 s = 60 s more
      await vi.advanceTimersByTimeAsync(0)
      expect(t.actionIds()).toEqual(['timer-stop', 'timer-add'])

      await vi.advanceTimersByTimeAsync(59_000)
      expect(t.last().options.silent).toBe(true) // not finished yet
      await vi.advanceTimersByTimeAsync(1_000)
      await Promise.all(t.waiting)
      expect(t.last().options.body).toBe('Rest over — time for the next set.')
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores notifications that are not workout notifications', () => {
    const t = setup()
    t.click('timer', { kind: 'other' })
    expect(t.waiting).toHaveLength(0)
  })
})
