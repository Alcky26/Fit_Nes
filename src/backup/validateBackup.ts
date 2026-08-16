import type { BackupData } from './types'

type Check = (v: unknown) => boolean

const isString: Check = (v) => typeof v === 'string'
const isNumber: Check = (v) => typeof v === 'number' && Number.isFinite(v)
const isBoolean: Check = (v) => typeof v === 'boolean'
const isStringOrNull: Check = (v) => v === null || typeof v === 'string'
const isArray: Check = (v) => Array.isArray(v)
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function checkFields(obj: Record<string, unknown>, fields: Record<string, Check>, path: string, errors: string[]): void {
  for (const [key, check] of Object.entries(fields)) {
    if (!check(obj[key])) errors.push(`${path}.${key}: missing or invalid`)
  }
}

const EXERCISE_FIELDS: Record<string, Check> = {
  id: isString,
  name: isString,
  category: isString,
  description: isString,
  photoId: isStringOrNull,
  statDefs: isArray,
  usesSets: isBoolean,
  archived: isBoolean,
  createdAt: isNumber,
  updatedAt: isNumber,
}

const SESSION_FIELDS: Record<string, Check> = {
  id: isString,
  date: isString,
  startTime: isStringOrNull,
  endTime: isStringOrNull,
  title: isString,
  notes: isString,
  createdAt: isNumber,
  updatedAt: isNumber,
}

const ENTRY_FIELDS: Record<string, Check> = {
  id: isString,
  sessionId: isString,
  exerciseId: isString,
  date: isString,
  sets: isArray,
  notes: isString,
  createdAt: isNumber,
  updatedAt: isNumber,
}

const PHOTO_FIELDS: Record<string, Check> = {
  id: isString,
  mimeType: isString,
  width: isNumber,
  height: isNumber,
  base64: isString,
}

export interface BackupSummary {
  exerciseCount: number
  sessionCount: number
  entryCount: number
  photoCount: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  summary: BackupSummary | null
  /** The input, narrowed to BackupData — present only when valid. The
   *  cast is safe here because checkFields has already verified every
   *  required field's presence and type at runtime. */
  data: BackupData | null
}

function validateArray(input: Record<string, unknown>, key: string, fields: Record<string, Check>, errors: string[]): unknown[] | null {
  const value = input[key]
  if (!isArray(value)) {
    errors.push(`${key}: expected an array`)
    return null
  }
  value.forEach((item, i) => {
    if (!isObject(item)) {
      errors.push(`${key}[${i}]: not an object`)
      return
    }
    checkFields(item, fields, `${key}[${i}]`, errors)
  })
  return value
}

export function validateBackup(input: unknown): ValidationResult {
  const errors: string[] = []
  if (!isObject(input)) {
    return { valid: false, errors: ['Backup file is not a valid JSON object.'], summary: null, data: null }
  }

  if (input.schemaVersion !== 1) {
    errors.push(`Unsupported backup schema version: ${JSON.stringify(input.schemaVersion)}`)
  }
  if (!isString(input.exportedAt)) {
    errors.push('exportedAt: expected a string')
  }

  const exercises = validateArray(input, 'exercises', EXERCISE_FIELDS, errors)
  const sessions = validateArray(input, 'workoutSessions', SESSION_FIELDS, errors)
  const entries = validateArray(input, 'workoutEntries', ENTRY_FIELDS, errors)
  const photos = validateArray(input, 'photos', PHOTO_FIELDS, errors)

  if (input.settings !== null && input.settings !== undefined && !isObject(input.settings)) {
    errors.push('settings: expected an object or null')
  }

  if (errors.length > 0) {
    return { valid: false, errors, summary: null, data: null }
  }

  return {
    valid: true,
    errors: [],
    summary: {
      exerciseCount: exercises?.length ?? 0,
      sessionCount: sessions?.length ?? 0,
      entryCount: entries?.length ?? 0,
      photoCount: photos?.length ?? 0,
    },
    data: input as unknown as BackupData,
  }
}
