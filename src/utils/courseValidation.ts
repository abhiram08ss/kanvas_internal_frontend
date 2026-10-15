/**
 * Validation rules for the Create / Edit Course form: reusable patterns plus one validator per field.
 * Every validator returns an error message, or `null` when the value is fine. The same rules are enforced again
 * by the backend (`CourseIn` in app/schemas.py) - this file is for fast, friendly feedback, not for security.
 */

// ---------------------------------------------------------------- limits
export const TITLE_MIN = 3
export const TITLE_MAX = 150
/** The course-code column is 20 characters wide in the database, so that is the real upper limit. */
export const CODE_MAX = 20
export const DESCRIPTION_MIN = 10
export const DESCRIPTION_MAX = 2000
export const OUTCOME_MIN = 3
export const OUTCOME_MAX = 200
export const OUTCOMES_MAX = 20
export const MESSAGE_MIN = 5
export const MESSAGE_MAX = 1000
export const DURATION_MAX_HOURS = 1000
export const CERT_MONTHS_MAX = 120
export const COVER_MAX_MB = 5

// ---------------------------------------------------------------- patterns
/** Letters (any language), numbers, spaces and everyday title punctuation: & ' ’ ( ) [ ] , . : ; ! ? - _ / + # @ % */
export const TITLE_REGEX = /^[\p{L}\p{M}\p{N} &'’()[\],.:;!?\-_/+#@%]+$/u
/** Capital letters and digits; single "-" or "_" separators only between them (REACT101, CS_01, SAFETY-2026). */
export const CODE_REGEX = /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/
/** Any printable text (letters, numbers, punctuation, symbols, emoji) - just no control characters. */
export const OUTCOME_REGEX = /^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+$/u
export const INTEGER_REGEX = /^\d+$/
export const POSITIVE_INTEGER_REGEX = /^[1-9]\d*$/
export const DECIMAL_REGEX = /^\d+(?:\.\d{1,2})?$/
export const QUIZ_COUNT_REGEX = /^(?:all|[1-9]\d{0,3})$/i

export const COVER_TYPES: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
}

// ---------------------------------------------------------------- helpers
const nonSpaceLength = (text: string) => text.replace(/\s/g, '').length
const hasLetterOrDigit = (text: string) => /[\p{L}\p{N}]/u.test(text)

/** Course codes are always stored in capitals, so the input is upper-cased as the user types. */
export const normalizeCode = (value: string) => value.toUpperCase().replace(/\s+/g, ' ')

// ---------------------------------------------------------------- validators
export function validateTitle(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Course title is required.'
  if (v.length < TITLE_MIN) return `Course title must be at least ${TITLE_MIN} characters.`
  if (v.length > TITLE_MAX) return `Course title must be ${TITLE_MAX} characters or fewer.`
  if (!hasLetterOrDigit(v)) return 'Course title must contain letters or numbers, not only punctuation.'
  if (!TITLE_REGEX.test(v)) return "Use letters, numbers, spaces and common punctuation (& ' ( ) , . : - _) only."
  return null
}

export function validateCode(value: string): string | null {
  if (!value) return 'Course code is required.'
  if (/\s/.test(value)) return 'Course code cannot contain spaces.'
  if (value.length > CODE_MAX) return `Course code must be ${CODE_MAX} characters or fewer.`
  if (/^[-_]/.test(value) || /[-_]$/.test(value)) return 'Course code must start and end with a letter or number.'
  if (/[-_]{2,}/.test(value)) return 'Course code cannot have two separators in a row.'
  if (!CODE_REGEX.test(value)) return 'Use only capital letters, numbers, hyphens and underscores (e.g. REACT101, CS_01).'
  return null
}

/** `options` come from the API (course options); a dropdown value is checked against them, never against a regex. */
export function validateCategory(value: string | undefined | null, options: readonly string[]): string | null {
  if (!value) return 'Please select a category.'
  if (!options.includes(value)) return 'That category is not available. Please pick one from the list.'
  return null
}

export function validateDescription(value: string): string | null {
  const n = nonSpaceLength(value)
  if (n === 0) return 'Description is required.'
  if (n < DESCRIPTION_MIN) return `Description must be at least ${DESCRIPTION_MIN} characters (not counting spaces).`
  if (value.trim().length > DESCRIPTION_MAX) return `Description must be ${DESCRIPTION_MAX.toLocaleString()} characters or fewer.`
  return null
}

/** Reads the first bytes of a file and checks they really are the image type the file claims to be. */
export async function sniffImageType(file: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const startsWith = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b)
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return 'image/gif'
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

/** Cheap checks first (size, extension, declared MIME type), then the file's real content. */
export async function validateCoverFile(file: File): Promise<string | null> {
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > COVER_MAX_MB * 1024 * 1024) return `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB - the limit is ${COVER_MAX_MB} MB.`
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const allowedExt = Object.values(COVER_TYPES).flat()
  if (!allowedExt.includes(ext)) return 'Only PNG, JPG, GIF or WEBP images are allowed.'
  const allowedForType = COVER_TYPES[file.type]
  if (!allowedForType) return 'This file is not a supported image type (PNG, JPG, GIF or WEBP).'
  if (!allowedForType.includes(ext)) return `The file name ends in .${ext} but the file is ${file.type}. Rename it or choose another image.`
  const real = await sniffImageType(file)
  if (real !== file.type) return 'The file content is not a valid image of that type. Choose a real PNG, JPG, GIF or WEBP image.'
  return null
}

/**
 * Outcomes are optional. Each entry that has text must be 3-200 characters and unique; an empty row followed by a
 * filled one is flagged (the single empty row at the very end is just the "type the next one here" input).
 * Returns the error message per row index.
 */
export function validateOutcomes(rows: readonly string[]): Record<number, string> {
  const errors: Record<number, string> = {}
  const seen = new Map<string, number>()
  const lastFilled = rows.reduce((acc, r, i) => (r.trim() ? i : acc), -1)
  rows.forEach((raw, i) => {
    const v = raw.trim()
    if (!v) {
      if (i < lastFilled) errors[i] = 'Fill in this outcome or remove it.'
      return
    }
    if (v.length < OUTCOME_MIN) errors[i] = `Each outcome needs at least ${OUTCOME_MIN} characters.`
    else if (v.length > OUTCOME_MAX) errors[i] = `Each outcome must be ${OUTCOME_MAX} characters or fewer.`
    else if (!OUTCOME_REGEX.test(v)) errors[i] = 'This outcome contains characters that are not allowed.'
    else {
      const key = v.toLowerCase().replace(/\s+/g, ' ')
      if (seen.has(key)) errors[i] = `Same as outcome ${(seen.get(key) ?? 0) + 1}. Each outcome must be different.`
      else seen.set(key, i)
    }
  })
  if (rows.filter((r) => r.trim()).length > OUTCOMES_MAX) errors[rows.length - 1] = `At most ${OUTCOMES_MAX} outcomes are allowed.`
  return errors
}

export function validatePassScore(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Pass score is required (enter 0 for none).'
  if (!INTEGER_REGEX.test(v)) return 'Pass score must be a whole number between 0 and 100.'
  if (Number(v) > 100) return 'Pass score cannot be more than 100.'
  return null
}

export function validateDuration(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (!DECIMAL_REGEX.test(v)) return 'Enter hours as a number, for example 2 or 1.5.'
  const n = Number(v)
  if (n <= 0) return 'Duration must be greater than 0.'
  if (n > DURATION_MAX_HOURS) return `Duration cannot be more than ${DURATION_MAX_HOURS} hours.`
  return null
}

/** `available`: how many quiz questions the course already has (undefined = unknown, so no upper check). */
export function validateQuizCount(value: string, available?: number): string | null {
  const v = value.trim()
  if (!v) return null
  if (!QUIZ_COUNT_REGEX.test(v)) return 'Leave blank, type "all", or enter a whole number of 1 or more.'
  if (v.toLowerCase() !== 'all' && available !== undefined && available > 0 && Number(v) > available) {
    return `This course only has ${available} quiz question${available === 1 ? '' : 's'}.`
  }
  return null
}

/** "all" is stored in lowercase; numbers as plain digits; blank stays blank. */
export const normalizeQuizCount = (value: string) => {
  const v = value.trim()
  return v.toLowerCase() === 'all' ? 'all' : v
}

export function validateCertMonths(value: string): string | null {
  const v = value.trim()
  if (!v) return null // blank = the certificate never expires
  if (!POSITIVE_INTEGER_REGEX.test(v)) return 'Enter a whole number of months (1 or more), or leave blank for no expiry.'
  if (Number(v) > CERT_MONTHS_MAX) return `Certificate validity cannot be more than ${CERT_MONTHS_MAX} months.`
  return null
}

/** The template must be one of the names the API returned (including the default option). */
export function validateCertificateTemplate(value: string, options: readonly string[]): string | null {
  if (!value) return 'Please choose a certificate template.'
  if (!options.includes(value)) return 'That template is not available. Please pick one from the list.'
  return null
}

export function validateCompletionMessage(value: string): string | null {
  const n = nonSpaceLength(value)
  if (n === 0) return 'Completion message is required.'
  if (n < MESSAGE_MIN) return `Completion message must be at least ${MESSAGE_MIN} characters (not counting spaces).`
  if (value.trim().length > MESSAGE_MAX) return `Completion message must be ${MESSAGE_MAX.toLocaleString()} characters or fewer.`
  return null
}
