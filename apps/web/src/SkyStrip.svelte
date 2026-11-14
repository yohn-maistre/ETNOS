<script lang="ts">
  import { onMount } from 'svelte'
  import { visibleStars } from './sky-math.ts'
  import { SKY_STARS } from './sky-stars.ts'

  let {
    latitude = -2.53,
    longitude = 140.72,
    label = 'Jayapura',
  }: { latitude?: number; longitude?: number; label?: string } = $props()

  let now = $state(Date.now())
  let reduced = $state(true)

  const sky = $derived(visibleStars(SKY_STARS, now, latitude, longitude))
  const description = $derived(
    sky.phase === 'malam'
      ? `Langit di atas ${label} sekarang: malam, ${sky.placed.length} bintang terang terlihat`
      : sky.phase === 'senja'
        ? `Langit di atas ${label} sekarang: senja, ${sky.placed.length} bintang terang mulai terlihat`
        : `Langit di atas ${label} sekarang: siang`,
  )
  // Sun-driven wash strength: day is a calm wash, twilight eases down to night.
  const wash = $derived(
    sky.phase === 'siang' ? 0.06 : sky.phase === 'senja' ? 0.06 * (1 + sky.sunAlt / 12) : 0,
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
      timer = setInterval(() => (now = Date.now()), 60_000)
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

  const radius = (mag: number) => Math.max(0.6, Math.min(2, 1.7 - mag * 0.35))
</script>

<svg class="sky-strip" role="img" aria-label={description} focusable="false">
  <rect width="100%" height="100%" style="opacity: {wash}" class="wash" />
  {#each sky.placed as p, i (p.star.name ?? i)}
    <circle
      class="star"
      class:twinkle={!reduced && i % 7 === 0}
      style="animation-delay: {(i % 5) * 0.9}s; opacity: {Math.max(0.12, p.fade * Math.min(0.55, 0.5 - p.star.mag * 0.06))}"
      cx="{p.x * 100}%"
      cy="{6 + p.y * 88}%"
      r={radius(p.star.mag)}
    />
  {/each}
</svg>

<style>
  .sky-strip {
    display: block;
    width: 100%;
    height: 44px;
    pointer-events: none;
    user-select: none;
    background: linear-gradient(
      to bottom,
      color-mix(in oklab, var(--brand) 5%, var(--background)),
      transparent
    );
  }
  @media (min-width: 768px) {
    .sky-strip {
      height: 56px;
    }
  }
  .wash {
    fill: color-mix(in oklab, var(--brand) 40%, var(--background));
  }
  .star {
    fill: var(--brand);
  }
  :global(.dark) .star {
    fill: var(--foreground);
  }
  .twinkle {
    animation: sky-twinkle 6s ease-in-out infinite;
  }
  @keyframes sky-twinkle {
    50% {
      filter: opacity(0.55);
    }
  }
</style>
