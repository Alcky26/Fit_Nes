import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from '../test/resetDatabase'
import { exerciseRepository } from './exerciseRepository'

beforeEach(async () => {
  await resetDatabase()
})

describe('exerciseRepository', () => {
  it('creates an exercise and reads it back with defaults applied', async () => {
    const created = await exerciseRepository.create({
      name: 'Treadmill',
      category: 'cardio',
      description: '',
      photoId: null,
      statDefs: [],
      usesSets: false,
    })

    const fetched = await exerciseRepository.get(created.id)
    expect(fetched?.name).toBe('Treadmill')
    expect(fetched?.archived).toBe(false)
    expect(fetched?.createdAt).toBe(fetched?.updatedAt)
  })

  it('excludes archived exercises from listActive() but keeps them in list()', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Old Machine',
      category: 'other',
      description: '',
      photoId: null,
      statDefs: [],
      usesSets: false,
    })
    await exerciseRepository.archive(exercise.id)

    const active = await exerciseRepository.listActive()
    expect(active.find((e) => e.id === exercise.id)).toBeUndefined()

    const all = await exerciseRepository.list()
    expect(all.find((e) => e.id === exercise.id)?.archived).toBe(true)
  })

  it('restore() brings an archived exercise back into listActive()', async () => {
    const exercise = await exerciseRepository.create({
      name: 'Rowing Machine',
      category: 'cardio',
      description: '',
      photoId: null,
      statDefs: [],
      usesSets: false,
    })
    await exerciseRepository.archive(exercise.id)
    await exerciseRepository.restore(exercise.id)

    const active = await exerciseRepository.listActive()
    expect(active.find((e) => e.id === exercise.id)).toBeDefined()
  })

  it('persists edits made via update() without touching createdAt', async () => {
    const created = await exerciseRepository.create({
      name: 'Seated Row',
      category: 'back',
      description: '',
      photoId: null,
      statDefs: [],
      usesSets: true,
    })

    const updated = await exerciseRepository.update(created.id, { name: 'Cable Seated Row' })
    expect(updated.name).toBe('Cable Seated Row')
    expect(updated.createdAt).toBe(created.createdAt)

    const fetched = await exerciseRepository.get(created.id)
    expect(fetched?.name).toBe('Cable Seated Row')
  })

  it('update() rejects an unknown id instead of silently creating one', async () => {
    await expect(exerciseRepository.update('does-not-exist', { name: 'X' })).rejects.toThrow()
  })
})
