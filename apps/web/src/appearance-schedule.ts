import { darkness, julianDate, sunAltAz } from './sky-math.ts'
import { sitePlace } from './site-place.ts'

export type ThemeMode = 'clock' | 'light' | 'dark'

/**
 * 0 by day to 1 by night, from the sun over this deployment's place (not the
 * reader's location: nothing is requested from the device). Blends across
 * civil twilight, roughly forty minutes near the equator.
 */
export function solarDarkness(now = new Date()) {
  return darkness(
    sunAltAz(julianDate(now.getTime()), sitePlace.latitude, sitePlace.longitude)
      .alt,
  )
}

export function scheduledTheme(
  mode: ThemeMode,
  now = new Date(),
): 'light' | 'dark' {
  if (mode !== 'clock') return mode
  return solarDarkness(now) >= 0.5 ? 'dark' : 'light'
}
