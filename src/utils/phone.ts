import { getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'IN'

export interface PhoneParts {
  /** ISO 3166 alpha-2 code of the dialling country, e.g. "IN". */
  country: CountryCode
  /** The number without the country code, digits only. */
  national: string
}

export const dialCode = (country: CountryCode): string => {
  try {
    return `+${getCountryCallingCode(country)}`
  } catch {
    return ''
  }
}

/** A saved number is "+919876543210"; older records hold only the 10 national digits (treated as India). */
export function parseStoredPhone(stored: string | null | undefined): PhoneParts {
  const raw = (stored ?? '').trim()
  if (!raw) return { country: DEFAULT_PHONE_COUNTRY, national: '' }
  if (raw.startsWith('+')) {
    const parsed = parsePhoneNumberFromString(raw)
    if (parsed?.country) return { country: parsed.country, national: parsed.nationalNumber }
  }
  return { country: DEFAULT_PHONE_COUNTRY, national: raw.replace(/\D/g, '') }
}

/** What is sent to the server: international format without spaces, or '' when nothing was typed. */
export function toStoredPhone({ country, national }: PhoneParts): string {
  const digits = national.replace(/\D/g, '')
  return digits ? `${dialCode(country)}${digits}` : ''
}

/** "+91 9876543210" for review screens. */
export function displayPhone({ country, national }: PhoneParts): string {
  const digits = national.replace(/\D/g, '')
  return digits ? `${dialCode(country)} ${digits}` : ''
}

/** Required; must be a real number for the chosen country (length and leading digits). */
export function validatePhone({ country, national }: PhoneParts): string | null {
  const digits = national.trim()
  if (!digits) return 'Contact number is required.'
  if (!/^\d+$/.test(digits)) return 'Use digits only.'
  if (!isValidPhoneNumber(digits, country)) return `Enter a valid phone number for ${dialCode(country)}.`
  return null
}
