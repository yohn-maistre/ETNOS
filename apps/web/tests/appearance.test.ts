import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accentRoles, contrast } from '../src/appearance-color.ts'

test('palette presets and custom seeds retain readable accent text and button labels in both themes', () => {
  const seeds = [
    '#c5b0e2',
    '#aa8bd5',
    '#b7775c',
    '#7b9287',
    '#8b8b95',
    '#000000',
    '#ffffff',
    '#ffff00',
    '#ff0000',
    '#00ff00',
    '#0000ff',
    ...Array.from(
      { length: 400 },
      (_, i) => '#' + ((i * 41611) % 0x1000000).toString(16).padStart(6, '0'),
    ),
  ]
  for (const dark of [false, true])
    for (const seed of seeds) {
      const roles = accentRoles(seed, dark)
      assert.ok(contrast(roles.ink, dark ? '#2a292c' : '#eeeae5') >= 4.7, seed)
      assert.ok(contrast(roles.ink, roles.foreground) >= 4.5, seed)
    }
})

import { bases, baseRoles } from '../src/appearance-bases.ts'
test('every base ramp has readable body and secondary text in both themes', () => {
  for (const base of bases)
    for (const dark of [false, true]) {
      const roles = baseRoles(base.id, dark)
      for (const surface of [
        '--reading-surface',
        '--page-ground',
        '--secondary',
      ] as const) {
        assert.ok(
          contrast(roles['--foreground'], roles[surface]) >= 4.5,
          base.id + ' primary',
        )
        assert.ok(
          contrast(roles['--muted-foreground'], roles[surface]) >= 4.5,
          base.id + ' muted ' + surface,
        )
      }
    }
})

import { scheduledTheme, solarDarkness } from '../src/appearance-schedule.ts'
import { themeFrame, THEME_SHIFT_MS } from '../src/appearance-transition.ts'
test('automatic theme follows the sun over the site, blends through twilight, and manual choices override it', () => {
  // Jayapura (UTC+9). Sunset on 15 Nov 2026 is close to 08:45 UTC.
  for (const [iso, expected] of [
    ['2026-11-15T01:30:00Z', 'light'], // 10:30 local
    ['2026-11-15T07:30:00Z', 'light'], // 16:30 local
    ['2026-11-15T13:00:00Z', 'dark'], // 22:00 local
    ['2026-11-15T19:00:00Z', 'dark'], // 04:00 local
  ] as const) {
    const now = new Date(iso)
    assert.equal(scheduledTheme('clock', now), expected)
    assert.equal(scheduledTheme('light', now), 'light')
    assert.equal(scheduledTheme('dark', now), 'dark')
  }
  assert.equal(solarDarkness(new Date('2026-11-15T03:00:00Z')), 0)
  assert.equal(solarDarkness(new Date('2026-11-15T13:00:00Z')), 1)
  // Around sunset the blend is partial and only grows as the sun sinks.
  const steps = [8.6, 8.75, 8.9, 9.05].map((h) =>
    solarDarkness(new Date(Date.UTC(2026, 10, 15, 0, h * 60))),
  )
  assert.ok(steps.some((d) => d > 0.05 && d < 0.95))
  for (let i = 1; i < steps.length; i++) assert.ok(steps[i] >= steps[i - 1])
})
test('slow automatic shifts preserve body and action contrast through both directions on every base', () => {
  assert.ok(THEME_SHIFT_MS >= 30000)
  for (const base of bases)
    for (const direction of [true, false])
      for (let step = 0; step <= 200; step++) {
        const frame = themeFrame(base.id, direction, step / 200, '#1680fa')
        for (const ink of ['--foreground', '--muted-foreground', '--brand'])
          for (const surface of [
            '--page-ground',
            '--reading-surface',
            '--secondary',
          ])
            assert.ok(
              contrast(frame[ink], frame[surface]) >= 4.5,
              `${base.id} ${direction} ${step}: ${ink} on ${surface}`,
            )
        assert.ok(
          contrast(frame['--brand'], frame['--brand-foreground']) >= 4.5,
        )
      }
})
