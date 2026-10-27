/* Workout notification handlers — loaded into the generated service worker
 * via workbox `importScripts` (see vite.config.ts). Plain JS on purpose: it
 * runs in the service worker, outside the app bundle, and talks to the same
 * IndexedDB database ('fitness-tracker') as the app.
 *
 * Notification actions:
 *   "Repeat last set" → saves the same set again right here
 *   "Rest <time>"     → starts the rest timer (the exercise's rest time);
 *                       while it runs the buttons become "Stop timer" and
 *                       "+30 s", and a beep/vibration plays when it ends
 *   tapping the body  → opens the app on the Add Entry form for the exercise
 */
'use strict'

var FT_DB_NAME = 'fitness-tracker'
var FT_NOTIFICATION_TAG = 'workout-current'
var FT_DONE_TAG = 'workout-timer-done'
// How long the "rest over" alert stays before it is cleared automatically.
var FT_DONE_VISIBLE_MS = 15 * 1000
// Used when an exercise has no rest time set. Keep in sync with
// DEFAULT_REST_SECONDS in src/pwa/workoutNotification.ts.
var FT_DEFAULT_REST_SECONDS = 90
// Browsers stop a service worker that has been busy for ~5 minutes, so a
// single timer run is capped just below that.
var FT_MAX_TIMER_MS = 290 * 1000

function ftRequest(request) {
  return new Promise(function (resolve, reject) {
    request.onsuccess = function () {
      resolve(request.result)
    }
    request.onerror = function () {
      reject(request.error)
    }
  })
}

/** Opens the existing database; never creates an empty one. */
function ftOpenDb() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(FT_DB_NAME)
    request.onupgradeneeded = function () {
      // The database doesn't exist yet (app never opened) — abort rather
      // than leave a schema-less database behind.
      request.transaction.abort()
    }
    request.onsuccess = function () {
      resolve(request.result)
    }
    request.onerror = function () {
      reject(request.error)
    }
  })
}

function ftTodayIso() {
  var d = new Date()
  var month = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + month + '-' + day
}

function ftFormatValues(statDefs, values) {
  return (statDefs || [])
    .filter(function (def) {
      return values[def.id] !== undefined && values[def.id] !== ''
    })
    .map(function (def) {
      return def.unit ? String(values[def.id]) + def.unit : String(values[def.id])
    })
    .join(' · ')
}

function ftNewestFirst(entries) {
  return entries.slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return b.createdAt - a.createdAt
  })
}

/**
 * Saves one more set for the exercise, copying the most recent set:
 *  - if there is already an entry today, the set is appended to it;
 *  - otherwise a new entry is created in today's session (created if
 *    needed) from the last set of the most recent entry.
 * Resolves to { status: 'saved', setNumber, sessionId, summary } or { status: 'nothing' }
 * when there is no previous set to repeat.
 */
async function ftRepeatLastSet(exerciseId) {
  var db = await ftOpenDb()
  try {
    var tx = db.transaction(['exercises', 'workoutSessions', 'workoutEntries'], 'readwrite')
    var exercises = tx.objectStore('exercises')
    var sessions = tx.objectStore('workoutSessions')
    var entries = tx.objectStore('workoutEntries')

    var exercise = await ftRequest(exercises.get(exerciseId))
    if (!exercise) return { status: 'nothing' }

    var all = ftNewestFirst(await ftRequest(entries.index('by-exerciseId').getAll(exerciseId)))
    var newest = all[0]
    if (!newest || newest.sets.length === 0) return { status: 'nothing' }

    var today = ftTodayIso()
    var now = Date.now()
    var todayEntry = all.find(function (e) {
      return e.date === today
    })
    var source = todayEntry && todayEntry.sets.length > 0 ? todayEntry : newest
    var lastSet = source.sets[source.sets.length - 1]
    var values = Object.assign({}, lastSet.values)

    var setNumber
    var sessionId
    if (todayEntry && exercise.usesSets) {
      sessionId = todayEntry.sessionId
      setNumber = todayEntry.sets.length + 1
      todayEntry.sets.push({ setNumber: setNumber, values: values })
      todayEntry.updatedAt = now
      await ftRequest(entries.put(todayEntry))
    } else {
      var todaysSessions = await ftRequest(sessions.index('by-date').getAll(today))
      var session = todaysSessions[0]
      if (!session) {
        session = {
          id: crypto.randomUUID(),
          date: today,
          startTime: null,
          endTime: null,
          title: 'Workout',
          notes: '',
          createdAt: now,
          updatedAt: now,
        }
        await ftRequest(sessions.add(session))
      }
      setNumber = 1
      sessionId = session.id
      await ftRequest(
        entries.add({
          id: crypto.randomUUID(),
          sessionId: session.id,
          exerciseId: exerciseId,
          date: today,
          sets: [{ setNumber: 1, values: values }],
          notes: '',
          createdAt: now,
          updatedAt: now,
        }),
      )
    }

    return { status: 'saved', setNumber: setNumber, sessionId: sessionId, summary: ftFormatValues(exercise.statDefs, values) }
  } finally {
    db.close()
  }
}

function ftFormatDuration(seconds) {
  var total = Math.max(0, Math.round(seconds))
  var minutes = Math.floor(total / 60)
  var rest = total % 60
  if (minutes === 0) return rest + ' s'
  return rest === 0 ? minutes + ' min' : minutes + ' min ' + rest + ' s'
}

function ftRestSeconds(data) {
  return typeof data.restSeconds === 'number' && data.restSeconds > 0 ? data.restSeconds : FT_DEFAULT_REST_SECONDS
}

function ftActions(data) {
  if (typeof data.timerEndsAt === 'number') {
    return [
      { action: 'timer-stop', title: 'Stop timer' },
      { action: 'timer-add', title: '+30 s' },
    ]
  }
  return [
    { action: 'repeat', title: 'Repeat last set' },
    { action: 'timer', title: 'Rest ' + ftFormatDuration(ftRestSeconds(data)) },
  ]
}

function ftShowNotification(data, body, extra) {
  return self.registration.showNotification(
    data.exerciseName,
    Object.assign(
      {
        body: body,
        tag: FT_NOTIFICATION_TAG,
        renotify: false,
        silent: true,
        requireInteraction: true,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        actions: ftActions(data),
        data: data,
      },
      extra || {},
    ),
  )
}

// ---- Rest timer ---------------------------------------------------------
// A service worker can't tick a visible countdown, so the notification shows
// the time the rest ends. The worker is kept alive (event.waitUntil on the
// returned promise) until then, and the end is announced with a normal
// (non-silent) notification: the phone's notification sound plus vibration.

var ftTimer = null // { endsAt, timeoutId, finish } while a rest is running

function ftIdleData(data) {
  var copy = Object.assign({}, data)
  delete copy.timerEndsAt
  return copy
}

function ftClearTimer() {
  if (!ftTimer) return
  clearTimeout(ftTimer.timeoutId)
  var finish = ftTimer.finish
  ftTimer = null
  finish()
}

function ftRemainingMs(data) {
  var endsAt = ftTimer ? ftTimer.endsAt : data.timerEndsAt
  return typeof endsAt === 'number' ? Math.max(0, endsAt - Date.now()) : 0
}

function ftTimeLabel(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ftLogError(error) {
  console.error('Workout notification error', error)
}

/** Starts (or restarts) the rest timer. The returned promise settles when
 *  the timer ends or is cleared, so it can be passed to event.waitUntil. */
function ftStartTimer(data, durationMs) {
  ftClearTimer()
  var duration = Math.min(Math.max(durationMs, 1000), FT_MAX_TIMER_MS)
  var endsAt = Date.now() + duration
  var base = ftIdleData(data)

  return new Promise(function (resolve) {
    var timer = { endsAt: endsAt, timeoutId: null, finish: resolve }
    ftTimer = timer
    ftShowNotification(Object.assign({}, base, { timerEndsAt: endsAt }), 'Resting until ' + ftTimeLabel(endsAt)).catch(ftLogError)
    timer.timeoutId = setTimeout(function () {
      if (ftTimer === timer) ftTimer = null
      ftTimerDone(base).catch(ftLogError).then(resolve)
    }, duration)
  })
}

/** Rest finished: put the normal notification back (silently), then raise a
 *  brand-new alert notification. A new notification — not an update of the
 *  existing one — is what reliably makes Android play its sound and vibrate. */
async function ftTimerDone(base) {
  await ftShowNotification(base, base.body || '')
  await self.registration.showNotification(base.exerciseName, {
    body: 'Rest over — time for the next set.',
    tag: FT_DONE_TAG,
    silent: false,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: Object.assign({}, base, { kind: 'workout-timer-done' }),
  })
  await ftBroadcast({ type: 'ft-timer-done' })
  await new Promise(function (resolve) {
    setTimeout(resolve, FT_DONE_VISIBLE_MS)
  })
  var alerts = await self.registration.getNotifications({ tag: FT_DONE_TAG })
  alerts.forEach(function (n) {
    n.close()
  })
}

function ftStopTimer(data) {
  ftClearTimer()
  var base = ftIdleData(data)
  return ftShowNotification(base, base.body || '').catch(ftLogError)
}

async function ftBroadcast(message) {
  var windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  windows.forEach(function (client) {
    client.postMessage(message)
  })
  return windows
}

async function ftHandleRepeat(data) {
  try {
    var result = await ftRepeatLastSet(data.exerciseId)
    if (result.status === 'saved') {
      var saved = 'Set ' + result.setNumber + ' saved: ' + result.summary
      await ftShowNotification(Object.assign({}, data, { body: saved }), saved)
      await ftBroadcast({ type: 'ft-data-changed', sessionId: result.sessionId })
    } else {
      await ftShowNotification(data, 'Nothing to repeat yet — tap this notification to log your first set.')
    }
  } catch (error) {
    console.error('Could not save from notification', error)
    await ftShowNotification(data, "Couldn't save the set. Tap this notification to add it in the app.")
  }
}

/** Brings the app to the front. If it is already open it is left on whatever
 *  screen the user is on; if not, it opens on the Add Entry form for the
 *  exercise. */
async function ftOpenApp(data) {
  var windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  var target = windows.find(function (client) {
    return 'focus' in client
  })
  if (target) {
    await target.focus()
    return
  }
  await self.clients.openWindow('./#/log?exercise=' + encodeURIComponent(data.exerciseId))
}

/** Android removes a notification when it is tapped, so put it back —
 *  still counting down if a rest timer is running. */
function ftReshow(data) {
  var remaining = ftRemainingMs(data)
  if (remaining > 0) {
    var endsAt = ftTimer ? ftTimer.endsAt : data.timerEndsAt
    return ftShowNotification(Object.assign({}, data, { timerEndsAt: endsAt }), 'Resting until ' + ftTimeLabel(endsAt))
  }
  var idle = ftIdleData(data)
  return ftShowNotification(idle, idle.body || '')
}

self.addEventListener('notificationclick', function (event) {
  var data = event.notification.data
  if (data && data.kind === 'workout-timer-done') {
    event.notification.close()
    event.waitUntil(ftOpenApp(data))
    return
  }
  if (!data || data.kind !== 'workout') return

  // Action buttons keep the notification: it is re-shown with the result.
  if (event.action === 'repeat') {
    event.waitUntil(ftHandleRepeat(data))
    return
  }
  if (event.action === 'timer') {
    event.waitUntil(ftStartTimer(data, ftRestSeconds(data) * 1000))
    return
  }
  if (event.action === 'timer-add') {
    event.waitUntil(ftStartTimer(data, ftRemainingMs(data) + 30 * 1000))
    return
  }
  if (event.action === 'timer-stop') {
    event.waitUntil(ftStopTimer(data))
    return
  }
  // Tap on the notification itself: open the app, and keep the notification.
  event.waitUntil(ftOpenApp(data).then(function () { return ftReshow(data) }).catch(ftLogError))
})

// Exposed so the unit tests can exercise the data logic directly.
self.ftWorkoutNotification = { repeatLastSet: ftRepeatLastSet }
