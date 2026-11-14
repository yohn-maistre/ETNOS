// Low-precision astronomy for the decorative sky strip. Pure functions, no I/O.
// GMST and solar position: Meeus, "Astronomical Algorithms" (2nd ed.), ch. 7, 12, 25 (low-accuracy
// forms, as in the Astronomical Almanac). Accuracy is well under 1 degree, plenty for decoration.
import type { SkyStar } from './sky-stars.ts'

const RAD = Math.PI / 180
const norm360 = (d: number) => ((d % 360) + 360) % 360

/** Julian date from a JS timestamp (ms since Unix epoch, UTC). */
export function julianDate(ms: number): number {
  return ms / 86400000 + 2440587.5
}

/** Greenwich mean sidereal time in degrees [0, 360). */
export function gmstDeg(jd: number): number {
  const d = jd - 2451545.0
  const t = d / 36525
  return norm360(280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000)
}

/** Local sidereal time in degrees; longitude is east-positive degrees. */
export function localSiderealDeg(jd: number, longitude: number): number {
  return norm360(gmstDeg(jd) + longitude)
}

export interface AltAz {
  /** altitude above horizon, degrees */
  alt: number
  /** azimuth from north through east, degrees [0, 360) */
  az: number
}

/** Horizontal coordinates from equatorial ones. raHours in hours, decDeg and latitude in degrees. */
export function altAz(jd: number, latitude: number, longitude: number, raHours: number, decDeg: number): AltAz {
  const h = (localSiderealDeg(jd, longitude) - raHours * 15) * RAD
  const dec = decDeg * RAD
  const lat = latitude * RAD
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(h)
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / RAD
  const az =
    Math.atan2(
      -Math.cos(dec) * Math.sin(h),
      Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(h),
    ) / RAD
  return { alt, az: norm360(az) }
}

/** Sun's geometric altitude in degrees (no refraction). */
export function sunAltitude(jd: number, latitude: number, longitude: number): number {
  const n = jd - 2451545.0
  const meanLon = 280.46 + 0.9856474 * n
  const g = (357.528 + 0.9856003 * n) * RAD
  const lambda = (meanLon + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD
  const eps = (23.439 - 0.0000004 * n) * RAD
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / RAD
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) / RAD
  return altAz(jd, latitude, longitude, norm360(ra) / 15, dec).alt
}

export type SkyPhase = 'siang' | 'senja' | 'malam'

export function phaseOf(sunAlt: number): SkyPhase {
  return sunAlt > 0 ? 'siang' : sunAlt > -12 ? 'senja' : 'malam'
}

/** Faintest magnitude shown for a given sun altitude: none by day, fading up to 4 at night. */
export function limitingMagnitude(sunAlt: number): number {
  if (sunAlt > 0) return -99
  if (sunAlt <= -12) return 4
  return -1 + (5 * -sunAlt) / 12
}

export interface PlacedStar {
  star: SkyStar
  /** 0..1 across the panorama (south at 0.5, north at the edges) */
  x: number
  /** 0..1 from the top (alt 80) to the bottom (alt 10) */
  y: number
  alt: number
  /** 0..1 visibility from twilight fade */
  fade: number
}

export const ALT_MIN = 10
export const ALT_MAX = 80

export function visibleStars(
  stars: readonly SkyStar[],
  ms: number,
  latitude: number,
  longitude: number,
): { phase: SkyPhase; sunAlt: number; placed: PlacedStar[] } {
  const jd = julianDate(ms)
  const sunAlt = sunAltitude(jd, latitude, longitude)
  const lim = limitingMagnitude(sunAlt)
  const placed: PlacedStar[] = []
  for (const star of stars) {
    if (star.mag >= lim) continue
    const { alt, az } = altAz(jd, latitude, longitude, star.ra, star.dec)
    if (alt < ALT_MIN || alt > ALT_MAX) continue
    const d = ((az - 180 + 540) % 360) - 180
    placed.push({
      star,
      x: 0.5 + d / 360,
      y: 1 - (alt - ALT_MIN) / (ALT_MAX - ALT_MIN),
      alt,
      fade: Math.max(0, Math.min(1, (lim - star.mag) / 1.5)),
    })
  }
  return { phase: phaseOf(sunAlt), sunAlt, placed }
}
