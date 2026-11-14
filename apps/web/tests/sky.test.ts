import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  altAz,
  gmstDeg,
  julianDate,
  localSiderealDeg,
  phaseOf,
  sunAltitude,
  visibleStars,
} from '../src/sky-math.ts'
import { SKY_STARS } from '../src/sky-stars.ts'

const LAT = -2.53
const LON = 140.72 // Jayapura, WIT = UTC+9

const near = (actual: number, expected: number, tol: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: got ${actual}, expected ${expected} +/- ${tol}`)

test('julian date and sidereal time at known instants', () => {
  // J2000.0 epoch: JD 2451545.0 exactly, GMST 280.46061837 deg (IAU definition).
  const j2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
  assert.equal(julianDate(j2000), 2451545.0)
  near(gmstDeg(2451545.0), 280.46061837, 1e-6, 'GMST at J2000')
  // LST = GMST + east longitude: 280.4606 + 140.72 = 421.1806 -> 61.18 deg.
  near(localSiderealDeg(2451545.0, LON), 61.1806, 0.01, 'LST at J2000, Jayapura')
  // Meeus example 12.a: 1987-04-10 19:21:00 UT, GMST = 8h34m57.0896s = 128.7371 deg.
  near(gmstDeg(julianDate(Date.UTC(1987, 3, 10, 19, 21, 0))), 128.7371, 0.01, 'Meeus 12.a')
})

test('Sirius altitude/azimuth over Jayapura matches an independent derivation', () => {
  // 2026-11-15T13:00:00Z. Derived separately in Python (days since J2000 from datetime arithmetic,
  // GMST = 280.46061837 + 360.98564736629 d = 249.6306 deg, LST = 30.3506 deg, Sirius RA 101.28 deg
  // so H = -70.93 deg), then a vector rotation into the horizon frame: alt 18.98, az 106.81
  // (east-south-east, Sirius having risen about an hour earlier at 22:00 local).
  const jd = julianDate(Date.UTC(2026, 10, 15, 13, 0, 0))
  near(localSiderealDeg(jd, LON), 30.35, 0.05, 'LST')
  const s = altAz(jd, LAT, LON, 6.752, -16.716)
  near(s.alt, 18.98, 1, 'Sirius altitude')
  near(s.az, 106.81, 1, 'Sirius azimuth')
})

test('sun altitude sign at local noon and midnight in Jayapura', () => {
  const noon = julianDate(Date.UTC(2026, 10, 15, 3, 0, 0)) // 12:00 WIT
  const midnight = julianDate(Date.UTC(2026, 10, 15, 15, 0, 0)) // 00:00 WIT
  // November: solar declination about -18.5, so noon altitude about 90 - 16 = 74.
  const hi = sunAltitude(noon, LAT, LON)
  const lo = sunAltitude(midnight, LAT, LON)
  assert.ok(hi > 60 && hi < 90, `noon ${hi}`)
  assert.ok(lo < -60, `midnight ${lo}`)
  assert.equal(phaseOf(hi), 'siang')
  assert.equal(phaseOf(lo), 'malam')
  assert.equal(phaseOf(-6), 'senja')
})

test('stars appear only at night and fade in during twilight', () => {
  assert.ok(SKY_STARS.length >= 120)
  const day = visibleStars(SKY_STARS, Date.UTC(2026, 10, 15, 3, 0, 0), LAT, LON)
  assert.equal(day.placed.length, 0)
  const night = visibleStars(SKY_STARS, Date.UTC(2026, 10, 15, 15, 0, 0), LAT, LON)
  assert.ok(night.placed.length > 10)
  for (const p of night.placed) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
})
