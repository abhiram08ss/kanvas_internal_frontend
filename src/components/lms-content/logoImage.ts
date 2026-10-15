import { useEffect, useState } from 'react'
import { api, API_ORIGIN } from '../../api'

/** A certificate logo can be plain text ("Company Default") or an uploaded image (stored like a course cover: <32 hex>.<ext>). */
const IMAGE_ID = /^[0-9a-f]{32}\.(png|jpe?g|gif|webp)$/i
export const DEFAULT_LOGO = 'Company Default'

/** The built-in Kanvas logo (a file in /public): the company default until a different default logo is uploaded. */
export const KANVAS_LOGO = '/kanvas-logo.png'

export const isLogoImage = (logo: string) => logo === KANVAS_LOGO || IMAGE_ID.test(logo)
export const logoImageUrl = (logo: string) => (logo === KANVAS_LOGO ? KANVAS_LOGO : `${API_ORIGIN}/courses/covers/${logo}`)

/** "Company Default" becomes the uploaded default logo, or the Kanvas logo when none was uploaded; anything else is returned as-is. */
export const resolveLogo = (logo: string, defaultLogo: string | null) => (logo === DEFAULT_LOGO ? (defaultLogo ?? KANVAS_LOGO) : logo)

// The default logo is shared app-wide: fetched once, and every user of the hook updates when it is changed.
let current: string | null = null
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<(logo: string | null) => void>()
const publish = (logo: string | null) => {
  current = logo
  loaded = true
  listeners.forEach((fn) => fn(logo))
}

export function useDefaultLogo() {
  const [logo, setLogo] = useState<string | null>(current)
  useEffect(() => {
    listeners.add(setLogo)
    if (!loaded && !loading) {
      loading = api
        .defaultCertificateLogo()
        .then((r) => publish(r.logo))
        .catch(() => publish(null))
        .finally(() => {
          loading = null
        })
    }
    return () => {
      listeners.delete(setLogo)
    }
  }, [])
  return {
    defaultLogo: logo,
    upload: async (file: File) => publish((await api.setDefaultCertificateLogo(file)).logo),
    clear: async () => {
      await api.clearDefaultCertificateLogo()
      publish(null)
    },
  }
}
