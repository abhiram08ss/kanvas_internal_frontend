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

// ---------------------------------------------------------------- patterns
/** CAPITAL letters and numbers, with single hyphens only between alphanumeric segments (ACME, ACME-01). */
export const TENANT_CODE_REGEX = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/
/** What the course search accepts while typing: the course-name characters, and an empty box. */
export const COURSE_SEARCH_REGEX = /^[\p{L}\p{M}\p{N} &'’()[\],.:;!?\-_/+#@%]*$/u

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
