/**
 * Reusable regex patterns and validators for the tenant / course forms.
 * Every validator returns an error message, or `null` when the value is fine, so a component can do
 * `setError(validateTenantCode(value))` and render the message next to the field.
 */

// ---------------------------------------------------------------- limits
/** The course search accepts what a course title can contain, up to the title limit. */
export const COURSE_NAME_MAX = 150
export const TENANT_CODE_MIN = 2
export const TENANT_CODE_MAX = 40
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 64

// ---------------------------------------------------------------- patterns
/** CAPITAL letters and numbers, with single hyphens only between alphanumeric segments (ACME, ACME-01). */
export const TENANT_CODE_REGEX = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
/** What the course search accepts while typing: the course-name characters, and an empty box. */
export const COURSE_SEARCH_REGEX = /^[\p{L}\p{M}\p{N} &'’()[\],.:;!?\-_/+#@%]*$/u
/** At least one lowercase, one uppercase, one digit and one special character, no whitespace, PASSWORD_MIN-PASSWORD_MAX long. */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/
export const PASSWORD_HINT = '8-64 characters with an uppercase letter, a lowercase letter, a number and a special character. No spaces.'

// ---------------------------------------------------------------- validators
export function validateTenantCode(value: string): string | null {
  if (!value) return 'Tenant code is required.'
  if (/\s/.test(value)) return 'Tenant code cannot contain spaces.'
  if (value.startsWith('-') || value.endsWith('-')) return 'Tenant code cannot start or end with a hyphen.'
  if (value.includes('--')) return 'Tenant code cannot have two hyphens in a row.'
  if (!TENANT_CODE_REGEX.test(value)) return 'Use only capital letters, numbers and single hyphens between them (e.g. ACME-01).'
  if (value.length < TENANT_CODE_MIN) return `Tenant code must be at least ${TENANT_CODE_MIN} characters.`
  if (value.length > TENANT_CODE_MAX) return `Tenant code must be ${TENANT_CODE_MAX} characters or fewer.`
  return null
}

/** Empty and partial input are fine; a message appears only when a character is not allowed. */
export function validateCourseSearch(value: string): string | null {
  return COURSE_SEARCH_REGEX.test(value) ? null : "Search can only contain letters, numbers, spaces and common punctuation."
}

/** Strips whitespace as the user types or pastes, since passwords cannot contain spaces. */
export function stripSpaces(value: string): string {
  return value.replace(/\s/g, '')
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required.'
  if (/\s/.test(value)) return 'Password cannot contain spaces.'
  if (value.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`
  if (value.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (!/\d/.test(value)) return 'Password must include a number.'
  if (!PASSWORD_REGEX.test(value)) return 'Password must include a special character (e.g. ! @ # $).'
  return null
}

/** Sign-in username or email: required, no spaces, and a proper address when it contains "@". */
export function validateLoginUsername(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Enter your username or email.'
  if (/\s/.test(v)) return 'Username cannot contain spaces.'
  if (v.length < 3) return 'Username must be at least 3 characters.'
  if (v.length > 100) return 'Username must be 100 characters or fewer.'
  if (v.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.'
  return null
}

/** Sign-in password: only presence and length are checked (the server decides if it is right). */
export function validateLoginPassword(value: string): string | null {
  if (!value) return 'Enter your password.'
  if (value.length > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`
  return null
}

