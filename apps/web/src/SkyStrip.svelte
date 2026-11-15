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
    
  let {
    latitude = sitePlace.latitude,
    longitude = sitePlace.longitude,
    label = sitePlace.label,
  }: { latitude?: number; longitude?: number; label?: string } = $props()

  const uid = $props.id()
  let now = $state(Date.now())
  let reduced = $state(true)

  const W = 1000,
    H = 110,
    SKY_TOP = 8,
    SKY_BOTTOM = 66
  const sky = $derived(visibleStars(SKY_STARS, now, latitude, longitude))
  const sun = $derived(sunAltAz(julianDate(now), latitude, longitude))
  const dark = $derived(darkness(sun.alt))
  // Horizon glow peaks around sunset and sunrise, nothing at noon or midnight.
  const glow = $derived(Math.max(0, 1 - Math.abs(sun.alt + 2) / 8))

  // Engraved ridges: each range is cut as contour lines that follow its own
  // crest, like a woodblock. Fixed seed, so the land never shifts.
  function crest(base: number, amp: number, seed: number, peaks: [number, number, number][]) {
    const pts: [number, number][] = []
    for (let x = -10; x <= W + 10; x += 6) {
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
    return pts
  }
  const line = (pts: [number, number][], dy: number, wobble: number, phase: number) =>
    pts
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${(y + dy + wobble * Math.sin(x / 23 + phase)).toFixed(1)}`)
      .join(' ')
  function range(pts: [number, number][], gap: number, count: number, seed: number) {
    const shape = line(pts, 0, 0, 0) + ` L${W + 10} ${H} L-10 ${H} Z`
    const hatch = Array.from({ length: count }, (_, k) => ({
      d: line(pts, 1.6 + k * gap, 0.35 + k * 0.05, seed + k * 1.9),
      width: Math.max(0.6, 1.6 - k * 0.07),
      dash: `${18 + ((k * 7 + seed * 3) % 23)} ${1.2 + (k % 3) * 0.8}`,
      offset: (k * 13 + seed * 5) % 31,
    }))
    return { shape, crest: line(pts, 0, 0, 0), hatch }
  }
  const ranges = [
    range(crest(74, 6, 1.7, [[170, 26, 70], [520, 36, 95], [860, 22, 60]]), 3.1, 14, 1),
    range(crest(96, 5, 4.2, [[330, 13, 80], [700, 16, 85]]), 2.6, 7, 4),
  ]

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

  const radius = (mag: number) => Math.max(0.9, Math.min(2.6, 2.3 - mag * 0.45))
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
      <pattern id={'dither-' + uid} width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".75" fill="currentColor" />
      </pattern>
      <pattern id={'fine-' + uid} width="2.6" height="2.6" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".7" fill="currentColor" />
      </pattern>
      <linearGradient id={'land-' + uid} x2="0" y2="1">
        <stop stop-color="white" />
        <stop offset=".35" stop-color="white" />
        <stop offset=".62" stop-color="white" stop-opacity=".55" />
        <stop offset=".84" stop-color="white" stop-opacity=".15" />
        <stop offset="1" stop-color="black" />
      </linearGradient>
      <mask id={'fade-' + uid} maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill={'url(#land-' + uid + ')'} />
      </mask>
      <radialGradient id={'halo-' + uid}>
        <stop stop-color="white" />
        <stop offset=".45" stop-color="white" stop-opacity=".55" />
        <stop offset="1" stop-color="black" />
      </radialGradient>
      <mask id={'sunmask-' + uid} maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill={'url(#halo-' + uid + ')'} />
      </mask>
      <linearGradient id={'dusk-' + uid} x2="0" y2="1">
        <stop stop-color="black" />
        <stop offset=".7" stop-color="white" />
        <stop offset="1" stop-color="black" />
      </linearGradient>
      <mask id={'duskmask-' + uid} maskContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill={'url(#dusk-' + uid + ')'} />
      </mask>
    </defs>

    {#if glow > 0.02}
      <rect
        x="0"
        y="34"
        width={W}
        height="44"
        fill={'url(#dither-' + uid + ')'}
        mask={'url(#duskmask-' + uid + ')'}
        opacity={0.35 * glow}
      />
    {/if}

    {#if sunAt}
      <g class="sun">
        <circle cx={sunAt.x * W} cy={y(sunAt.y)} r="7" class="sun-core" />
        {#each [11, 15, 19.5, 24.5] as r, k}
          <circle cx={sunAt.x * W} cy={y(sunAt.y)} {r} stroke-width={1 - k * 0.18} stroke-dasharray={k ? '2 ' + (1.5 + k) : 'none'} />
        {/each}
      </g>
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
        class:twinkle={!reduced && i % 6 === 0}
        style="animation-delay: {(i % 7) * 0.8}s"
        fill="currentColor"
        opacity={Math.max(0.3, p.fade * Math.min(1, 0.95 - p.star.mag * 0.12))}
        cx={p.x * W}
        cy={y(p.y)}
        r={radius(p.star.mag)}
      />
    {/each}

    <g mask={'url(#fade-' + uid + ')'}>
      {#each ranges as r, i}
        <clipPath id={'cut-' + uid + '-' + i}><path d={r.shape} /></clipPath>
        <path d={r.shape} class="land" />
        <g clip-path={'url(#cut-' + uid + '-' + i + ')'} class="hatch">
          {#each r.hatch as h}
            <path d={h.d} stroke-width={h.width} stroke-dasharray={h.dash} stroke-dashoffset={h.offset} />
          {/each}
        </g>
        <path d={r.crest} class="crest" />
      {/each}
    </g>
  </svg>
</div>

<style>
  .sky-window {
    height: 76px;
    margin-bottom: -10px;
    color: var(--brand);
    pointer-events: none;
    user-select: none;
  }
  @media (min-width: 768px) {
    .sky-window {
      height: 104px;
    }
  }
  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  .land {
    fill: var(--card, var(--background));
  }
  .hatch path,
  .crest {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    vector-effect: non-scaling-stroke;
  }
  .crest {
    stroke-width: 1.8;
  }
  .sun circle {
    fill: none;
    stroke: currentColor;
    vector-effect: non-scaling-stroke;
  }
  .sun .sun-core {
    fill: currentColor;
    opacity: 0.85;
  }
  .figure {
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-dasharray: 0.1 3.4;
    opacity: 0.55;
  }
  .breathe {
    animation: sky-breathe 9s ease-in-out infinite;
  }
  @keyframes sky-breathe {
    0%,
    100% {
      opacity: 0.25;
    }
    50% {
      opacity: 0.75;
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
