<script lang="ts">
  import emblaCarouselSvelte from 'embla-carousel-svelte'
  import type { EmblaCarouselType, EmblaOptionsType } from 'embla-carousel'
  import { ArrowUpRight, Box, ChevronLeft, ChevronRight, Languages } from '@lucide/svelte'
  import { Badge } from '$lib/components/ui/badge'

  export type CarouselSlide = {
    id: string
    href: string
    title: string
    subtitle: string
    badge: string
    thumb?: string
    is3d?: boolean
    kind?: 'object' | 'atlas'
  }

  let {
    slides = [],
    label = 'Sorotan visual Ensiklopedia',
  }: {
    slides: CarouselSlide[]
    label?: string
  } = $props()

  let api = $state<EmblaCarouselType | null>(null)
  let selected = $state(0)
  let canPrev = $state(false)
  let canNext = $state(false)

  const options: EmblaOptionsType = {
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
  }

  function sync(embla: EmblaCarouselType) {
    selected = embla.selectedScrollSnap()
    canPrev = embla.canScrollPrev()
    canNext = embla.canScrollNext()
  }

  function onInit(event: CustomEvent<EmblaCarouselType>) {
    const embla = event.detail
    api = embla
    sync(embla)
    embla.on('select', () => sync(embla))
    embla.on('reInit', () => sync(embla))
  }
</script>

{#if slides.length}
  <div class="sc-wrap" role="region" aria-roledescription="carousel" aria-label={label}>
    <div
      class="sc-viewport"
      use:emblaCarouselSvelte={{ options, plugins: [] }}
      onemblaInit={onInit}
    >
      <div class="sc-track">
        {#each slides as s (s.id)}
          <div class="sc-slide" role="group" aria-roledescription="slide">
            <a class="sc-card" class:is-atlas={s.kind === 'atlas'} href={s.href}>
              {#if s.thumb}
                <img src={s.thumb} alt="" loading="lazy" />
              {:else if s.kind === 'atlas'}
                <div class="sc-atlas-art" aria-hidden="true">
                  <svg viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <radialGradient id="sc-atlas-glow" cx="55%" cy="45%" r="65%">
                        <stop offset="0%" stop-color="#14b8a6" stop-opacity="0.34" />
                        <stop offset="100%" stop-color="#0f172a" stop-opacity="0" />
                      </radialGradient>
                    </defs>
                    <rect width="360" height="220" fill="url(#sc-atlas-glow)" />
                    <g stroke="rgba(255,255,255,0.22)" stroke-width="1">
                      <line x1="68" y1="74" x2="138" y2="96" />
                      <line x1="138" y1="96" x2="212" y2="82" />
                      <line x1="212" y1="82" x2="292" y2="118" />
                      <line x1="138" y1="96" x2="188" y2="142" />
                      <line x1="188" y1="142" x2="262" y2="156" />
                    </g>
                    <g fill="#5eead4">
                      <circle cx="68" cy="74" r="5" />
                      <circle cx="138" cy="96" r="6.5" />
                      <circle cx="212" cy="82" r="5.5" />
                      <circle cx="188" cy="142" r="6" />
                      <circle cx="292" cy="118" r="5" />
                      <circle cx="262" cy="156" r="4.5" />
                    </g>
                    <g fill="rgba(255,255,255,0.45)">
                      <circle cx="96" cy="54" r="2.2" />
                      <circle cx="168" cy="64" r="2.2" />
                      <circle cx="244" cy="66" r="2.2" />
                      <circle cx="114" cy="134" r="2.2" />
                      <circle cx="232" cy="126" r="2.2" />
                      <circle cx="312" cy="88" r="2.2" />
                    </g>
                  </svg>
                </div>
              {:else}
                <div class="sc-fallback" aria-hidden="true"></div>
              {/if}

              <div class="sc-scrim" aria-hidden="true"></div>

              <div class="sc-top">
                <Badge variant="secondary" class="sc-pill">
                  {#if s.is3d}
                    <Box size={12} aria-hidden="true" />
                  {:else if s.kind === 'atlas'}
                    <Languages size={12} aria-hidden="true" />
                  {/if}
                  <span>{s.badge}</span>
                </Badge>
                <span class="sc-go" aria-hidden="true"><ArrowUpRight size={15} /></span>
              </div>

              <div class="sc-caption">
                <strong>{s.title}</strong>
                {#if s.subtitle}<small>{s.subtitle}</small>{/if}
              </div>
            </a>
          </div>
        {/each}
      </div>
    </div>

    {#if slides.length > 1}
      <div class="sc-controls">
        <div class="sc-dots" aria-hidden="true">
          {#each slides as s, i (s.id)}
            <button
              type="button"
              class="sc-dot"
              class:active={i === selected}
              tabindex="-1"
              onclick={() => api?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
            ></button>
          {/each}
        </div>
        <div class="sc-arrows">
          <button
            type="button"
            class="sc-arrow"
            disabled={!canPrev}
            onclick={() => api?.scrollPrev()}
            aria-label="Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            class="sc-arrow"
            disabled={!canNext}
            onclick={() => api?.scrollNext()}
            aria-label="Berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .sc-wrap {
    display: grid;
    gap: 10px;
    min-width: 0;
  }
  .sc-viewport {
    overflow: hidden;
    margin: 0 calc(var(--gutter, 24px) * -1);
    padding: 0 var(--gutter, 24px);
  }
  .sc-track {
    display: flex;
    gap: 12px;
  }
  .sc-slide {
    flex: 0 0 82%;
    min-width: 0;
  }
  @media (min-width: 560px) {
    .sc-slide {
      flex: 0 0 58%;
    }
  }
  .sc-card {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    aspect-ratio: 16 / 10;
    border-radius: 18px;
    overflow: hidden;
    background: #141920;
    color: #fff;
    text-decoration: none;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  .sc-card.is-atlas {
    background: linear-gradient(135deg, #0d2b2e 0%, #102030 55%, #162634 100%);
  }
  .sc-card img,
  .sc-atlas-art,
  .sc-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s ease;
  }
  .sc-atlas-art svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .sc-card:hover img {
    transform: scale(1.03);
  }
  .sc-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(10, 14, 18, 0.32) 0%,
      rgba(10, 14, 18, 0.05) 38%,
      rgba(10, 14, 18, 0.72) 78%,
      rgba(10, 14, 18, 0.9) 100%
    );
    pointer-events: none;
  }
  .sc-top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 12px 0;
  }
  .sc-top :global(.sc-pill) {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(15, 20, 26, 0.72);
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(8px);
    font-size: 12px;
    font-weight: 650;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .sc-go {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(15, 20, 26, 0.6);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.16);
  }
  .sc-caption {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 2px;
    padding: 0 14px 13px;
  }
  .sc-caption strong {
    font-size: 16px;
    font-weight: 750;
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: #fff;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sc-caption small {
    font-size: 12.5px;
    line-height: 1.35;
    color: rgba(241, 245, 249, 0.84);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sc-card:focus-visible {
    outline: 2px solid var(--ring, var(--brand));
    outline-offset: 2px;
  }
  .sc-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .sc-dots {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .sc-dot {
    width: 7px;
    height: 7px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: color-mix(in oklab, var(--foreground) 20%, transparent);
    cursor: pointer;
    transition: width 0.2s ease, background 0.2s ease;
  }
  .sc-dot.active {
    width: 20px;
    background: var(--foreground);
  }
  .sc-arrows {
    display: flex;
    gap: 6px;
  }
  .sc-arrow {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--background);
    color: var(--foreground);
    cursor: pointer;
  }
  .sc-arrow:hover:not(:disabled) {
    background: color-mix(in oklab, var(--foreground) 6%, transparent);
  }
  .sc-arrow:disabled {
    opacity: 0.35;
    cursor: default;
  }
</style>
