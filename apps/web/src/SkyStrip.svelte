<script lang="ts">
  // A small window onto the sky over this deployment's place: the real sun
  // position by day, the real stars by night, over an ink-dithered ridge in the
  // reader's accent. Pure calculation from the device clock; no requests.
  import { onMount } from 'svelte'
  import {
    darkness,
    julianDate,
    altAz,
    panorama,
    sunAltAz,
    visibleStars,
  } from './sky-math.ts'
  import { SKY_STARS } from './sky-stars.ts'
  import { sitePlace } from './site-place.ts'
  import { appearance } from './appearance.svelte.ts'
  import { mixColor } from './appearance-transition.ts'

  let {
    latitude = sitePlace.latitude,
    longitude = sitePlace.longitude,
    label = sitePlace.label,
  }: { latitude?: number; longitude?: number; label?: string } = $props()

  const uid = $props.id()
  let now = $state(Date.now())
  let reduced = $state(true)

  const W = 1000,
    H = 120,
    SKY_TOP = 6,
    SKY_BOTTOM = 78
  const accent = $derived(
    /^#[0-9a-f]{6}$/i.test(appearance.accent) ? appearance.accent : '#1f4e8c',
  )
  const sky = $derived(visibleStars(SKY_STARS, now, latitude, longitude))
  const sun = $derived(sunAltAz(julianDate(now), latitude, longitude))
  const dark = $derived(darkness(sun.alt))

  // Sky colours at four sun altitudes, interpolated between neighbours.
  const keys = $derived([
    { alt: 12, top: mixColor(accent, '#ffffff', 0.74), bottom: mixColor(accent, '#ffffff', 0.9) },
    { alt: 3, top: mixColor(accent, '#ffffff', 0.62), bottom: mixColor('#f1d2a6', '#ffffff', 0.25) },
    { alt: -4, top: mixColor(accent, '#1a2238', 0.6), bottom: mixColor('#e3a274', accent, 0.38) },
    { alt: -12, top: mixColor(accent, '#05070d', 0.86), bottom: mixColor(accent, '#0c1324', 0.74) },
  ])
  const gradient = $derived.by(() => {
    const k = keys,
      a = sun.alt
    if (a >= k[0].alt) return k[0]
    if (a <= k[3].alt) return k[3]
    for (let i = 0; i < 3; i++)
      if (a <= k[i].alt && a >= k[i + 1].alt) {
        const t = (k[i].alt - a) / (k[i].alt - k[i + 1].alt)
        return {
          top: mixColor(k[i].top, k[i + 1].top, t),
          bottom: mixColor(k[i].bottom, k[i + 1].bottom, t),
        }
      }
    return k[0]
  })

  // Three ridges, far to near, from a fixed seed so the land never shifts.
  // Rolling hills plus a few soft peaks, in the spirit of the Tigi print.
  function ridge(base: number, amp: number, seed: number, peaks: [number, number, number][]) {
    const pts: [number, number][] = []
    for (let x = -10; x <= W + 10; x += 8) {
      let y =
        base -
        amp *
          (0.5 * Math.sin(x / 113 + seed) +
            0.3 * Math.sin(x / 47 + seed * 2.3) +
            0.12 * Math.sin(x / 19 + seed * 4.1))
      for (const [at, height, width] of peaks)
        y -= height * Math.exp(-(((x - at) / width) ** 2))
      pts.push([x, y])
    }
    const crest = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y.toFixed(1)}`).join(' ')
    return { crest, d: crest + ` L${W + 10} ${H} L-10 ${H} Z` }
  }
  const ridges = [
    { ...ridge(70, 7, 1.7, [[170, 26, 70], [520, 34, 95], [860, 22, 60]]), day: 0.84, night: 0.8, dot: 0.34, spacing: 5.5 },
    { ...ridge(88, 7, 4.2, [[330, 16, 80], [700, 20, 85]]), day: 0.74, night: 0.86, dot: 0.52, spacing: 4.2 },
    { ...ridge(104, 5, 7.9, [[90, 8, 60], [620, 9, 70], [960, 7, 50]]), day: 0.6, night: 0.92, dot: 0.74, spacing: 3.2 },
  ]
  const layer = $derived(
    ridges.map((r) => ({
      ...r,
      fill: mixColor(
        mixColor(accent, '#ffffff', r.day),
        mixColor(accent, '#04060c', r.night),
        dark,
      ),
      ink: mixColor(accent, mixColor(accent, '#ffffff', 0.4), dark),
      inkOpacity: r.dot * (1 - dark) + r.dot * 0.26 * dark,
    })),
  )

  const sunAt = $derived(
    sun.alt > -1 && sun.alt < 80 ? panorama(Math.max(sun.alt, 10), sun.az) : null,
  )
  const y = (p: number) => SKY_TOP + p * (SKY_BOTTOM - SKY_TOP)
  const figures = $derived.by(() => {
    if (dark < 0.6) return []
    const jd = julianDate(now)
    return sitePlace.figures.flatMap((f) => {
      const pts = f.stars.map(([ra, dec]) => {
        const h = altAz(jd, latitude, longitude, ra, dec)
        return h.alt >= 10 && h.alt <= 80 ? panorama(h.alt, h.az) : null
      })
      return f.lines.flatMap(([a, b]) => {
        const p = pts[a],
          q = pts[b]
        if (!p || !q || Math.abs(p.x - q.x) > 0.25) return []
        return [{ x1: p.x * W, y1: y(p.y), x2: q.x * W, y2: y(q.y) }]
      })
    })
  })
  const description = $derived(
    sky.phase === 'malam'
      ? `Langit di atas ${label} sekarang: malam, ${sky.placed.length} bintang terang terlihat`
      : sky.phase === 'senja'
        ? `Langit di atas ${label} sekarang: senja`
        : `Langit di atas ${label} sekarang: siang`,
  )

  onMount(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced = mq.matches
    const onMq = () => (reduced = mq.matches)
    mq.addEventListener('change', onMq)
    let timer: ReturnType<typeof setInterval> | undefined
    const stop = () => {
      if (timer !== undefined) clearInterval(timer)
      timer = undefined
    }
    const start = () => {
      stop()
      now = Date.now()
      timer = setInterval(() => (now = Date.now()), 30_000)
    }
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    if (!document.hidden) start()
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
      mq.removeEventListener('change', onMq)
    }
  })

  const radius = (mag: number) => Math.max(0.9, Math.min(2.8, 2.4 - mag * 0.5))
</script>

<div class="sky-window">
  <svg
    viewBox="0 0 {W} {H}"
    preserveAspectRatio="xMidYMax slice"
    role="img"
    aria-label={description}
    focusable="false"
  >
    <defs>
      <linearGradient id={'sky-' + uid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color={gradient.top} />
        <stop offset="1" stop-color={gradient.bottom} />
      </linearGradient>
      <radialGradient id={'sun-' + uid}>
        <stop offset="0" stop-color="#fffaf0" />
        <stop offset="0.35" stop-color="#fff3d6" stop-opacity=".9" />
        <stop offset="1" stop-color="#fff3d6" stop-opacity="0" />
      </radialGradient>
      <linearGradient id={'haze-' + uid} x1="0" y1="40" x2="0" y2={H} gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fff" stop-opacity=".25" />
        <stop offset="1" stop-color="#fff" stop-opacity="1" />
      </linearGradient>
      <mask id={'mist-' + uid} maskUnits="userSpaceOnUse" x="-10" y="0" width={W + 20} height={H}>
        <rect x="-10" y="0" width={W + 20} height={H} fill={'url(#haze-' + uid + ')'} />
      </mask>
      {#each layer as r, i}
        <pattern
          id={'dot-' + uid + '-' + i}
          width={r.spacing}
          height={r.spacing}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={r.spacing / 2}
            cy={r.spacing / 2}
            r={r.spacing * 0.22}
            fill={r.ink}
            fill-opacity={r.inkOpacity}
          />
        </pattern>
      {/each}
    </defs>

    <rect width={W} height={H} fill={'url(#sky-' + uid + ')'} />

    {#if sunAt}
      <circle cx={sunAt.x * W} cy={y(sunAt.y)} r="26" fill={'url(#sun-' + uid + ')'} />
      <circle cx={sunAt.x * W} cy={y(sunAt.y)} r="5.5" fill="#fffaf0" />
    {/if}

    {#each figures as l, i (i)}
      <line
        class="figure"
        class:breathe={!reduced}
        style="animation-delay: {i * 1.7}s"
        x1={l.x1}
        y1={l.y1}
        x2={l.x2}
        y2={l.y2}
      />
    {/each}

    {#each sky.placed as p, i (p.star.ra + ':' + p.star.dec)}
      <circle
        class="star"
        class:twinkle={!reduced && i % 6 === 0}
        style="animation-delay: {(i % 7) * 0.8}s; opacity: {Math.max(0.25, p.fade * Math.min(0.95, 0.85 - p.star.mag * 0.12))}"
        cx={p.x * W}
        cy={y(p.y)}
        r={radius(p.star.mag)}
      />
    {/each}

    {#each layer as r, i}
      <path d={r.d} fill={r.fill} />
      <path d={r.d} fill={'url(#dot-' + uid + '-' + i + ')'} mask={'url(#mist-' + uid + ')'} />
      <path
        d={r.crest}
        fill="none"
        stroke={r.ink}
        stroke-opacity={(0.28 + i * 0.12) * (1 - dark * 0.7)}
        stroke-width="0.8"
        vector-effect="non-scaling-stroke"
      />
    {/each}
  </svg>
</div>

<style>
  .sky-window {
    height: 60px;
    overflow: hidden;
    border-bottom: 1px solid var(--reading-line);
    pointer-events: none;
    user-select: none;
  }
  @media (min-width: 768px) {
    .sky-window {
      height: 76px;
      border-radius: inherit;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .star {
    fill: #f6f3ea;
  }
  .figure {
    stroke: #f6f3ea;
    stroke-width: 1.1;
    stroke-linecap: round;
    opacity: 0.32;
  }
  .breathe {
    animation: sky-breathe 9s ease-in-out infinite;
  }
  @keyframes sky-breathe {
    0%,
    100% {
      opacity: 0.16;
    }
    50% {
      opacity: 0.5;
    }
  }
  .twinkle {
    animation: sky-twinkle 5s ease-in-out infinite;
  }
  @keyframes sky-twinkle {
    50% {
      filter: opacity(0.45);
    }
  }
</style>
