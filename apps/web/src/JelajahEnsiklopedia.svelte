<script lang="ts">
  // The Ensiklopedia as a section of Jelajah (owner, 28 November 2026): Jelajah is the one door, and the full index
  // at /wiki is a page under it. Top to bottom: the regions as a rail of map tiles (arrows on pointer devices), a
  // compact Bahasa block with one real word on Peta Kata's map, the other kinds as cards with real glimpses, the
  // topics as pills, the Peta pengetahuan card, and a link to the full index. Everything below the rail loads when
  // the section comes near the screen, so a phone that never scrolls this far does not download it.
  import { onMount } from 'svelte'
  import emblaCarouselSvelte from 'embla-carousel-svelte'
  import type { EmblaCarouselType } from 'embla-carousel'
  import { ChevronLeft, ChevronRight } from '@lucide/svelte'
  import RegionArt, { type Atlas } from './RegionArt.svelte'
  import PetaKataGlimpse from './PetaKataGlimpse.svelte'
  import EnsiklopediaKinds from './EnsiklopediaKinds.svelte'
  import KnowledgeMapCard from './KnowledgeMapCard.svelte'
  import { loadIndex, type EntryIndex } from './entri'
  import { loadGlimpse } from './glimpse-data.ts'
  import type { Glimpse } from './ensiklopedia-glimpse.ts'
  import { loadViewerObjects, type ViewerObject } from './viewer-data.ts'
  import { OBSERVATORY_NAME } from './observatory-name.ts'
  import type { RegionLayer, TopicTile } from './explore-data'

  let { regionLayers, atlas, topics, failed = false }: { regionLayers: RegionLayer[]; atlas: Atlas | null; topics: TopicTile[]; failed?: boolean } = $props()

  let root = $state<HTMLElement>()
  let near = $state(false)
  let index = $state<EntryIndex | null>(null), glimpse = $state<Glimpse | null>(null), objects = $state<ViewerObject[]>([])
  onMount(() => {
    const go = () => {
      if (near) return
      near = true
      loadIndex().then((i) => (index = i)).catch(() => {})
      void loadGlimpse().then((g) => (glimpse = g))
      void loadViewerObjects().then((o) => (objects = o))
    }
    if (!('IntersectionObserver' in window) || location.hash) { go(); return }
    const io = new IntersectionObserver((seen) => { if (seen.some((e) => e.isIntersecting)) { go(); io.disconnect() } }, { rootMargin: '900px 0px' })
    if (root) io.observe(root)
    return () => io.disconnect()
  })

  // The place rail scrolls with Embla, so a mouse can move it with the arrows as well as a finger can swipe it.
  let rail = $state<EmblaCarouselType | null>(null), canPrev = $state(false), canNext = $state(false)
  function onRail(event: CustomEvent<EmblaCarouselType>) {
    const e = event.detail
    rail = e
    const sync = () => { canPrev = e.canScrollPrev(); canNext = e.canScrollNext() }
    sync()
    e.on('select', sync).on('reInit', sync).on('scroll', sync)
  }

  const TOPICS_FIRST = 9
  let allTopics = $state(false)
  const codeOf = $derived(new Map((glimpse?.languages ?? []).map((l) => [l.slug, l.code])))
  const fmt = (n: number) => n.toLocaleString('id-ID')
  const written = $derived((index?.entries ?? []).filter((e) => e.article).length)
</script>

<section id="ensiklopedia" class="jelajah-section je" aria-labelledby="ensiklopedia-title" bind:this={root}>
  <div class="jelajah-head">
    <h2 id="ensiklopedia-title">{OBSERVATORY_NAME}</h2>
    <a href="/wiki">Lihat semua</a>
  </div>
  <p class="jelajah-lede">{index ? fmt(index.entries.length) + ' entri tentang tempat, bahasa, suku dan alam Tanah Papua. ' + fmt(written) + ' di antaranya sudah ditulis.' : 'Tempat, bahasa, suku dan alam Tanah Papua, dengan sumbernya.'}</p>

  <div id="tempat" class="je-block">
    <div class="je-sub">
      <h3>Tempat</h3>
      <div class="je-sub-end">
        {#if regionLayers.length > 1}<div class="je-arrows">
            <button type="button" aria-label="Wilayah sebelumnya" disabled={!canPrev} onclick={() => rail?.scrollPrev()}><ChevronLeft size={17} /></button>
            <button type="button" aria-label="Wilayah berikutnya" disabled={!canNext} onclick={() => rail?.scrollNext()}><ChevronRight size={17} /></button>
          </div>{/if}
        <a href="/wiki/jenis/tempat">Semua tempat</a>
      </div>
    </div>
    {#if regionLayers.length}
      <div class="je-rail" use:emblaCarouselSvelte={{ options: { align: 'start', containScroll: 'trimSnaps', dragFree: true }, plugins: [] }} onemblaInit={onRail}>
        <ul class="place-scroll" aria-label="Wilayah adat">
          {#each regionLayers as s (s.slug)}<li>
              <a href={s.href}>
                <span class="place-map" aria-hidden="true">{#if atlas}<RegionArt {atlas} lit={[s.slug]} terrain />{/if}</span>
                <strong>{s.title}</strong>
                <span class="place-meta">{s.places.length} kabupaten dan kota · {s.languages} bahasa</span>
              </a>
            </li>{/each}
        </ul>
      </div>
      <p class="jelajah-foot">Wilayah adat di sini dipakai sebagai acuan dan tidak menunjukkan batas tanah adat.</p>
    {:else if !failed}<p class="jelajah-note" role="status">Memuat…</p>{/if}
  </div>

  <div id="bahasa" class="je-block">
    <div class="je-sub">
      <h3>Bahasa</h3>
      <div class="je-sub-end"><a href="/wiki/jenis/bahasa">Semua bahasa</a></div>
    </div>
    <a class="je-bahasa" href={glimpse ? '/wiki/peta-kata?konsep=' + glimpse.concept.key : '/wiki/peta-kata'}>
      <span class="je-bahasa-map"><PetaKataGlimpse forms={glimpse?.forms ?? null} {codeOf} labels={glimpse?.specimen ?? []} /></span>
      <span class="je-bahasa-text">
        {#if glimpse}
          <strong>Kata untuk <em>{glimpse.concept.id}</em> di {fmt(glimpse.forms.size)} bahasa</strong>
          <small>{fmt(glimpse.languages.length)} bahasa Tanah Papua di peta, {fmt(glimpse.languages.filter((l) => l.concepts > 0).length)} di antaranya punya kata dasar.</small>
        {:else}<strong>Peta Kata</strong><small>Kata dasar dalam bahasa-bahasa Tanah Papua, di titik setiap bahasa.</small>{/if}
      </span>
    </a>
  </div>

  <div class="je-block">
    <EnsiklopediaKinds {index} {glimpse} {objects} {atlas} set="jelajah" />
  </div>

  {#if topics.length}<div id="topik" class="je-block">
      <div class="je-sub"><h3>Topik</h3></div>
      <ul class="pill-set">
        {#each allTopics ? topics : topics.slice(0, TOPICS_FIRST) as t (t.slug)}<li><a class="pill" href={'/wiki/' + t.slug}>{t.title}</a></li>{/each}
        {#if topics.length > TOPICS_FIRST}<li><button type="button" class="pill ghost" aria-expanded={allTopics} onclick={() => (allTopics = !allTopics)}>{allTopics ? 'Lebih sedikit' : 'Semua ' + topics.length + ' topik'}</button></li>{/if}
      </ul>
    </div>{/if}

  <div class="je-block">
    {#if near}<KnowledgeMapCard />{/if}
  </div>

  <a class="je-all" href="/wiki">Buka {OBSERVATORY_NAME} lengkap</a>
</section>

<style>
  .je-block { display: grid; gap: 12px; margin-top: 26px; min-width: 0; }
  .jelajah-lede + .je-block { margin-top: 18px; }
  .je-sub { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 36px; }
  .je-sub h3 { margin: 0; font-size: 18px; font-weight: 750; letter-spacing: -0.015em; }
  .je-sub-end { display: flex; align-items: center; gap: 4px; }
  .je-sub-end > a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px; margin-right: -12px; border-radius: 999px; font-size: 14.5px; font-weight: 600; color: var(--brand, var(--foreground)); text-decoration: none; }
  .je-sub-end > a:hover { background: var(--row-hover); }

  /* Arrows only where a pointer cannot swipe: small, round and quiet. */
  .je-arrows { display: none; gap: 4px; }
  @media (hover: hover) and (pointer: fine) { .je-arrows { display: flex; } }
  .je-arrows button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); cursor: pointer; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s; }
  .je-arrows button:hover:not(:disabled) { background: var(--row-hover); }
  .je-arrows button:disabled { opacity: 0.35; cursor: default; }

  .je-rail { overflow: hidden; margin: 0 calc(var(--gutter) * -1); padding: 2px var(--gutter) 6px; mask-image: linear-gradient(to right, transparent, black var(--gutter), black calc(100% - 40px), transparent); }
  .je-rail .place-scroll { display: flex; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .je-rail .place-scroll li { flex: none; width: 168px; --ink: var(--tone-place); }
  .je-rail .place-scroll li:last-child { margin-right: 28px; }
  .je-rail a { display: grid; gap: 2px; color: inherit; text-decoration: none; border-radius: 16px; }
  .je-rail a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: 2px; }
  .place-map { position: relative; display: block; aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: color-mix(in oklab, var(--tone-place) 9%, var(--secondary)); margin-bottom: 8px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent); transition: box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .je-rail a:hover .place-map { box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 22%, transparent); }
  .je-rail strong { font-size: 16px; font-weight: 700; line-height: 1.25; letter-spacing: -0.01em; }
  .place-meta { font-size: 13.5px; line-height: 1.4; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

  /* Bahasa: one word on the map of every language, then a single line and the way in. */
  .je-bahasa { display: grid; gap: 14px; padding: 16px; border-radius: 18px; background: color-mix(in oklab, var(--foreground) 3.5%, var(--background)); --glimpse-ground: color-mix(in oklab, var(--foreground) 3.5%, var(--background)); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent); color: inherit; text-decoration: none; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .je-bahasa:hover { background: color-mix(in oklab, var(--foreground) 5.5%, var(--background)); }
  .je-bahasa:focus-visible { outline: 3px solid var(--ring, var(--brand)); outline-offset: 3px; }
  .je-bahasa-map { display: block; padding: 4px 24px 0 4px; }
  .je-bahasa-text { display: grid; gap: 4px; }
  .je-bahasa-text strong { font-size: 17px; font-weight: 750; letter-spacing: -0.015em; line-height: 1.25; }
  .je-bahasa-text em { font-style: normal; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, var(--foreground) 30%, transparent); }
  .je-bahasa-text small { font-size: 14px; line-height: 1.45; color: var(--muted-foreground); }

  .je-all { display: flex; justify-content: center; align-items: center; min-height: 46px; margin-top: 24px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 15px; font-weight: 650; text-decoration: none; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .je-all:hover { background: var(--row-hover); }
  .je-all:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: 2px; }

  @media (min-width: 640px) {
    .je-bahasa { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); align-items: end; padding: 18px 20px; }
    .je-bahasa-text strong { font-size: 19px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .je-arrows button, .place-map, .je-bahasa, .je-all { transition: none; }
  }
</style>
