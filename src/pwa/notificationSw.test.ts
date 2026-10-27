import { beforeEach, describe, expect, it, vi } from 'vitest'
import swSource from '../../public/notification-sw.js?raw'
import { entryRepository } from '../repositories/entryRepository'
import { exerciseRepository } from '../repositories/exerciseRepository'
import { sessionRepository } from '../repositories/sessionRepository'
import { resetDatabase } from '../test/resetDatabase'
import type { Exercise } from '../types'
import { todayIso } from '../utils/dates'

type RepeatResult = { status: 'saved'; setNumber: number; sessionId: string; summary: string } | { status: 'nothing' }

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
    expect(result).toEqual({ status: 'saved', setNumber: 3, sessionId: entry.sessionId, summary: '16 · 29kg' })

    const saved = await entryRepository.get(entry.id)
    expect(saved?.sets).toHaveLength(3)
    expect(saved?.sets[2]).toEqual({ setNumber: 3, values: { reps: 16, weight: 29 } })
  })

  it('creates a new entry in a new session today when only older history exists', async () => {
    const exercise = await createExercise(true)
    await addEntry(exercise, '2020-01-01', [{ reps: 10, weight: 36 }])

    const result = await loadServiceWorkerScript().ftWorkoutNotification!.repeatLastSet(exercise.id)
    expect(result).toMatchObject({ status: 'saved', setNumber: 1, summary: '10 · 36kg' })

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
  const DONE_VISIBLE_MS = 15_000

  type Shown = { title: string; options: Record<string, unknown> }

  function setup(openWindows: { focus: () => Promise<void> }[] = []) {
    const shown: Shown[] = []
    const closed: string[] = []
    const scope = {
      addEventListener: vi.fn(),
      registration: {
        showNotification: vi.fn(async (title: string, options: Record<string, unknown>) => {
          shown.push({ title, options })
        }),
        getNotifications: vi.fn(async ({ tag }: { tag: string }) => [{ close: () => closed.push(tag) }]),
      },
      clients: {
        matchAll: vi.fn(async () => openWindows),
        openWindow: vi.fn(async () => undefined),
      },
    }
    new Function('self', 'indexedDB', 'crypto', swSource)(scope, indexedDB, crypto)
    const call = scope.addEventListener.mock.calls.find((c) => c[0] === 'notificationclick')
    const listener = call?.[1] as (event: unknown) => void
    const waiting: Promise<unknown>[] = []
    const close = vi.fn()
    function click(action: string, data: Record<string, unknown> = DATA) {
      listener({ action, notification: { data, close }, waitUntil: (p: Promise<unknown>) => waiting.push(p) })
    }
    const withTag = (tag: string) => shown.filter((n) => n.options.tag === tag)
    const main = () => withTag('workout-current')
    const lastMain = () => main()[main().length - 1]!
    const alerts = () => withTag('workout-timer-done')
    const actionIds = (n: Shown) => (n.options.actions as { action: string }[]).map((a) => a.action)
    return { click, shown, closed, scope, waiting, close, main, lastMain, alerts, actionIds }
  }

  it('starts the timer, swaps the buttons, and raises a fresh alert when it ends', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      t.click('timer')
      await vi.advanceTimersByTimeAsync(0)
      expect(t.lastMain().options.body).toMatch(/^Resting until/)
      expect(t.actionIds(t.lastMain())).toEqual(['timer-stop', 'timer-add'])
      expect(t.lastMain().options.silent).toBe(true)

      await vi.advanceTimersByTimeAsync(89_000)
      expect(t.alerts()).toHaveLength(0) // still resting

      await vi.advanceTimersByTimeAsync(1_000)
      expect(t.alerts()).toHaveLength(1)
      const alert = t.alerts()[0]!
      expect(alert.options.body).toBe('Rest over — time for the next set.')
      expect(alert.options.silent).toBe(false)
      expect(alert.options.vibrate).toEqual([200, 100, 200])
      // The normal notification is restored, silently, with the idle buttons.
      expect(t.lastMain().options.body).toBe('Last set: 16 · 29kg')
      expect(t.lastMain().options.silent).toBe(true)
      expect(t.actionIds(t.lastMain())).toEqual(['repeat', 'timer'])

      await vi.advanceTimersByTimeAsync(DONE_VISIBLE_MS)
      await Promise.all(t.waiting)
      expect(t.closed).toEqual(['workout-timer-done'])
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
      expect(t.alerts()).toHaveLength(0)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(t.alerts()).toHaveLength(1)
      const actions = t.lastMain().options.actions as { action: string; title: string }[]
      expect(actions[1]?.title).toBe('Rest 45 s')
      await vi.advanceTimersByTimeAsync(DONE_VISIBLE_MS)

      t.click('timer', { ...DATA, restSeconds: undefined })
      await vi.advanceTimersByTimeAsync(89_000)
      expect(t.alerts()).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(t.alerts()).toHaveLength(2)
      await vi.advanceTimersByTimeAsync(DONE_VISIBLE_MS)
      await Promise.all(t.waiting)
    } finally {
      vi.useRealTimers()
    }
  })

  it('stops the timer without any alert and restores the last-set text', async () => {
    vi.useFakeTimers()
    try {
      const t = setup()
      t.click('timer')
      await vi.advanceTimersByTimeAsync(0)
      const runningData = t.lastMain().options.data as Record<string, unknown>
      t.click('timer-stop', runningData)
      await vi.advanceTimersByTimeAsync(0)
      expect(t.lastMain().options.body).toBe('Last set: 16 · 29kg')
      expect(t.actionIds(t.lastMain())).toEqual(['repeat', 'timer'])

      await vi.advanceTimersByTimeAsync(120_000)
      expect(t.alerts()).toHaveLength(0)
      await Promise.all(t.waiting)
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
      const runningData = t.lastMain().options.data as Record<string, unknown>
      t.click('timer-add', runningData) // 30 s left + 30 s = 60 s more
      await vi.advanceTimersByTimeAsync(0)
      expect(t.actionIds(t.lastMain())).toEqual(['timer-stop', 'timer-add'])

      await vi.advanceTimersByTimeAsync(59_000)
      expect(t.alerts()).toHaveLength(0)
      await vi.advanceTimersByTimeAsync(1_000)
      expect(t.alerts()).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(DONE_VISIBLE_MS)
      await Promise.all(t.waiting)
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

describe('notification service worker: tapping the notification', () => {
  const DATA = { kind: 'workout', exerciseId: 'e1', exerciseName: 'Chest Press', restSeconds: 90, body: 'Last set: 16 · 29kg' }

  function setup(openWindows: { focus: () => Promise<void> }[]) {
    const shown: { title: string; options: Record<string, unknown> }[] = []
    const scope = {
      addEventListener: vi.fn(),
      registration: {
        showNotification: vi.fn(async (title: string, options: Record<string, unknown>) => {
          shown.push({ title, options })
        }),
        getNotifications: vi.fn(async () => []),
      },
      clients: { matchAll: vi.fn(async () => openWindows), openWindow: vi.fn(async () => undefined) },
    }
    new Function('self', 'indexedDB', 'crypto', swSource)(scope, indexedDB, crypto)
    const listener = scope.addEventListener.mock.calls.find((c) => c[0] === 'notificationclick')?.[1] as (event: unknown) => void
    const waiting: Promise<unknown>[] = []
    const close = vi.fn()
    listener({ action: '', notification: { data: DATA, close }, waitUntil: (p: Promise<unknown>) => waiting.push(p) })
    return { shown, scope, waiting, close }
  }

  it('only brings an already-open app to the front, and keeps the notification', async () => {
    const focus = vi.fn(async () => undefined)
    const t = setup([{ focus }])
    await Promise.all(t.waiting)
    expect(focus).toHaveBeenCalledTimes(1)
    expect(t.scope.clients.openWindow).not.toHaveBeenCalled()
    expect(t.close).not.toHaveBeenCalled()
    expect(t.shown).toHaveLength(1)
    expect(t.shown[0]?.options.body).toBe('Last set: 16 · 29kg')
  })

  it('opens the exercise form when the app is closed, and keeps the notification', async () => {
    const t = setup([])
    await Promise.all(t.waiting)
    expect(t.scope.clients.openWindow).toHaveBeenCalledWith('./#/log?exercise=e1')
    expect(t.shown).toHaveLength(1)
  })
})
