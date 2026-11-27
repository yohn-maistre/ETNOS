<script lang="ts">
  // The kinds of the Ensiklopedia as cards that show a real glimpse of what each kind holds (Grafit: cover cards
  // with a dark wash where there is a picture, calm typographic plates where there is none). Cards come in trios,
  // one large and two small, so the grid has a rhythm without a wall of equal tiles:
  // - `semua` (/wiki): Tempat (terrain map), Bahasa (Peta Kata dots), Kamus (one word in a few languages), then
  //   Makhluk hidup (a species photo), Bentang alam (a terrain crop of a mountain), Suku (real names).
  // - `jelajah`: only the second trio, because Jelajah shows places and languages in their own blocks above.
  // A kind with fewer than three entries is not given a card; it joins "Kategori lain" with its honest count.
  import { ArrowUpRight } from '@lucide/svelte'
  import RegionArt, { type Atlas } from './RegionArt.svelte'
  import TerrainTiles from './TerrainTiles.svelte'
  import PetaKataGlimpse from './PetaKataGlimpse.svelte'
  import { KIND_NAME, shortCount, type EntryIndex } from './entri'
  import { project } from './terrain.ts'
  import { joinWords, sampleNames, type Glimpse } from './ensiklopedia-glimpse.ts'
  import type { ViewerObject } from './viewer-data.ts'

  let { index, glimpse = null, objects = [], atlas = null, set = 'semua' }: { index: EntryIndex | null; glimpse?: Glimpse | null; objects?: ViewerObject[]; atlas?: Atlas | null; set?: 'semua' | 'jelajah' } = $props()

  const MIN = 3
  const count = (k: string) => (k === 'kamus' ? index?.kamusLanguages ?? 0 : index?.counts[k] ?? 0)
  const of = (k: string) => (index?.entries ?? []).filter((e) => e.kind === k)
  const subWords = (k: string, n = 5) => joinWords((index?.subs[k] ?? []).slice(0, n).map((s) => s.label))
  const fmt = (n: number) => n.toLocaleString('id-ID')

  const codeOf = $derived(new Map((glimpse?.languages ?? []).map((l) => [l.slug, l.code])))
  const withWords = $derived(count('kamus'))

  // Makhluk hidup: the first species with a photo, and the photo's maker and licence for the foot line.
  // The tree kangaroo is photographed alive in its forest, which reads better on a card than a museum skin.
  const COVER_FIRST = ['kanguru-pohon-nemena']
  const creature = $derived.by(() => {
    const list = of('makhluk').filter((e) => e.thumb)
    return list.find((e) => COVER_FIRST.includes(e.slug)) ?? list[0] ?? null
  })
  const creaturePhoto = $derived.by(() => {
    if (!creature) return null
    const o = objects.find((x) => x.thumb === creature.thumb)
    const p = o?.photos?.[0]
    return p ? p.credit + ', ' + p.licence.name : ''
  })
  // Bentang alam: a terrain crop around the first landform that has a centre (Puncak Jaya in the shipped records).
  const landform = $derived(objects.find((o) => o.kind === 'landform' && o.landform) ?? null)
  const crop = $derived.by((): [number, number, number, number] | null => {
    const c = landform?.landform?.center
    if (!c) return null
    const [x, y] = project(c[1], c[0]), side = 56
    return [x - side / 2, y - side / 2, side, side]
  })
  const peoples = $derived(sampleNames(of('suku'), /^Suku\s+/i, 10))
  const tempatSubs = $derived.by(() => {
    const s = new Map((index?.subs.tempat ?? []).map((x) => [x.key, x.count]))
    const towns = (s.get('regency') ?? 0) + (s.get('city') ?? 0)
    return [s.get('customary-region') ? s.get('customary-region') + ' wilayah adat' : '', s.get('province') ? s.get('province') + ' provinsi' : '', towns ? towns + ' kabupaten dan kota' : ''].filter(Boolean)
  })

  type Card = { kind: string; href: string; title: string; meta: string }
  const card = (kind: string, meta: string, href = '/wiki/jenis/' + kind): Card => ({ kind, href, title: KIND_NAME[kind] ?? kind, meta })
  const trios = $derived.by(() => {
    if (!index) return []
    const first: Card[] = [
      card('tempat', shortCount(count('tempat')) + ' entri' + (tempatSubs.length ? ' · ' + joinWords(tempatSubs) : '')),
      card('bahasa', fmt(count('bahasa')) + ' bahasa · ' + fmt(withWords) + ' punya kata'),
      card('kamus', fmt(withWords) + ' bahasa punya kata'),
    ]
    const second: Card[] = [
      card('makhluk', count('makhluk') + ' entri' + (subWords('makhluk') ? ' · ' + subWords('makhluk') : '')),
      card('bentang-alam', count('bentang-alam') + ' entri' + (subWords('bentang-alam') ? ' · ' + subWords('bentang-alam') : '')),
      card('suku', fmt(count('suku')) + ' entri'),
    ]
    const keep = (list: Card[]) => list.filter((c) => count(c.kind) >= MIN)
    return (set === 'semua' ? [keep(first), keep(second)] : [keep(second)]).filter((t) => t.length)
  })
  // Kinds that have entries but no card of their own.
  const shown = $derived(new Set(trios.flat().map((c) => c.kind)))
  // Jelajah shows places, languages and topics in blocks of their own, so they are not repeated here.
  const LAIN = ['benda', 'lembaga', 'topik', 'peristiwa', 'orang', 'praktik', 'gagasan', 'musim', 'cerita', 'halaman', 'makhluk', 'bentang-alam', 'suku', 'tempat', 'bahasa']
  const others = $derived(
    LAIN.filter((k) => !shown.has(k) && count(k) > 0 && (set === 'semua' || !['tempat', 'bahasa', 'topik'].includes(k))).map((k) => ({
      kind: k,
      href: '/wiki/jenis/' + k,
      title: KIND_NAME[k] ?? k,
      meta: k === 'lembaga' ? count(k) + ' lembaga' : count(k) + ' entri',
      names: k === 'lembaga' ? (index?.lembaga ?? []).map((l) => l.title) : sampleNames(of(k), /^$/, 3),
      thumb: of(k).find((e) => e.thumb)?.thumb ?? null,
    })),
  )
</script>

{#if index}
  <div class="ek">
    {#each trios as trio, t (t)}
      <ul class={'ek-trio n' + trio.length} class:mirror={t % 2 === 1} aria-label="Isi Ensiklopedia">
        {#each trio as c, i (c.kind)}
          {@const cover = c.kind === 'tempat' || (c.kind === 'makhluk' && creature) || (c.kind === 'bentang-alam' && crop)}
          <li class:big={i === 0} class={'k-' + c.kind}>
            <a class={cover ? 'cover-wash ek-card' : 'ek-card ek-plate'} href={c.href}>
              {#if c.kind === 'tempat'}
                <div class="cover-wash-art ek-map" aria-hidden="true">{#if atlas}<RegionArt {atlas} terrain px={360} />{/if}</div>
              {:else if c.kind === 'makhluk' && creature}
                <div class="cover-wash-art" aria-hidden="true"><img src={creature.thumb} alt="" loading="lazy" decoding="async" /></div>
              {:else if c.kind === 'bentang-alam' && crop}
                <div class="cover-wash-art ek-relief" aria-hidden="true"><svg viewBox={crop.join(' ')} preserveAspectRatio="xMidYMid slice"><TerrainTiles box={crop} px={300} /></svg></div>
              {:else if c.kind === 'bahasa'}
                <div class="ek-art ek-dots" aria-hidden="true"><PetaKataGlimpse forms={glimpse?.forms ?? null} {codeOf} /></div>
              {:else if c.kind === 'kamus'}
                <div class="ek-art ek-specimen">
                  {#if glimpse?.specimen.length}
                    <p class="ek-concept">Kata untuk <b>{glimpse.concept.id}</b></p>
                    <dl>{#each glimpse.specimen.slice(0, 4) as s (s.code)}<div><dt>{s.form}</dt><dd>{s.name}</dd></div>{/each}</dl>
                  {/if}
                </div>
              {:else if c.kind === 'suku'}
                <p class="ek-art ek-names">{peoples.join(' · ')}</p>
              {/if}
              <span class={cover ? 'cover-wash-body ek-body' : 'ek-body'}>
                {#if c.kind === 'makhluk' && creature}<span class="ek-pictured">{creature.title}</span>{/if}
                <strong class="ek-title">{c.title}</strong>
                <span class="ek-meta">{c.meta}</span>
              </span>
              <ArrowUpRight class="ek-go" size={17} aria-hidden="true" />
            </a>
          </li>
        {/each}
      </ul>
    {/each}

    {#if others.length}
      <div class="ek-lain">
        <h3>Kategori lain</h3>
        <ul>
          {#each others as o (o.kind)}<li>
              <a href={o.href}>
                <span class="ek-lain-text"><strong>{o.title}</strong><small>{o.meta}{o.names.length ? ' · ' + joinWords(o.names) : ''}</small></span>
                {#if o.thumb}<img src={o.thumb} alt="" loading="lazy" decoding="async" />{:else}<ArrowUpRight size={16} aria-hidden="true" />{/if}
              </a>
            </li>{/each}
        </ul>
      </div>
    {/if}

    {#if creaturePhoto || crop}<p class="ek-credit">{[creaturePhoto ? 'Foto ' + creature?.title + ': ' + creaturePhoto : '', 'Peta dasar © EOX, OpenStreetMap contributors'].filter(Boolean).join('. ')}.</p>{/if}
  </div>
{:else}
  <div class="ek-hold" aria-hidden="true"><span></span><span></span><span></span></div>
{/if}

<style>
  .ek { display: grid; gap: 12px; min-width: 0; }
  .ek-trio { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ek-trio > li { min-width: 0; display: grid; }
  .ek-trio > li.big { grid-column: 1 / -1; }
  .ek-trio.n2 > li:not(.big) { grid-column: 1 / -1; }
  .ek-trio.n1 > li { grid-column: 1 / -1; }

  /* One card anatomy: the glimpse fills the card, the title and an honest count sit at the bottom. */
  .ek-card { position: relative; display: flex; flex-direction: column; justify-content: flex-end; min-height: 176px; border-radius: 18px; overflow: hidden; color: inherit; text-decoration: none; }
  .big .ek-card { min-height: 228px; }
  .ek-card.cover-wash { --wash-min: 176px; --wash-tone: #3a4a3f; }
  .ek-card.cover-wash .ek-body { --wash-fade: 44px; padding: 44px 16px 14px; }
  .ek-plate { padding: 14px 16px; gap: 10px; background: color-mix(in oklab, var(--foreground) 3.5%, var(--background)); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 7%, transparent); --glimpse-ground: color-mix(in oklab, var(--foreground) 3.5%, var(--background)); transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .ek-plate:hover { background: color-mix(in oklab, var(--foreground) 6%, var(--background)); }
  .ek-body { display: grid; gap: 2px; min-width: 0; }
  .ek-title { font-size: 19px; font-weight: 800; line-height: 1.12; letter-spacing: -0.02em; }
  .big .ek-title { font-size: 24px; }
  .ek-meta { font-size: 13.5px; line-height: 1.35; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .cover-wash .ek-title { color: #fff; }
  .cover-wash .ek-meta { color: rgb(255 255 255 / 0.84); }
  .ek-pictured { order: 3; font-size: 12.5px; color: rgb(255 255 255 / 0.7); }
  .ek-card :global(.ek-go) { position: absolute; top: 12px; right: 12px; color: var(--muted-foreground); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .cover-wash :global(.ek-go) { color: rgb(255 255 255 / 0.85); filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.4)); }
  .ek-card:hover :global(.ek-go) { transform: translate(2px, -2px); }
  .ek-card:focus-visible { outline: 3px solid var(--ring, var(--brand)); outline-offset: 3px; }

  /* The glimpses. */
  .ek-map :global(.region-art path) { stroke: rgb(255 255 255 / 0.55); stroke-width: 1.2; }
  /* The pale hillshade is pressed to graphite so the ridges read under the wash. */
  .ek-relief svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: grayscale(1) brightness(0.6) contrast(1.6); }
  .ek-relief { background: #3b3d3f; }
  .ek-art { flex: 1; min-height: 0; display: grid; }
  .ek-dots { place-items: center; padding: 4px 18px 0; }
  .ek-dots :global(.pkg) { max-width: 260px; }
  .ek-specimen { align-content: start; gap: 6px; padding-right: 20px; }
  .ek-concept { margin: 0; font-size: 13px; color: var(--muted-foreground); }
  .ek-concept b { color: var(--foreground); font-weight: 700; }
  .ek-specimen dl { margin: 0; display: grid; gap: 1px; }
  .ek-specimen dl div { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .ek-specimen dt { font-size: 19px; font-weight: 750; letter-spacing: -0.015em; line-height: 1.25; }
  .ek-specimen dd { margin: 0; font-size: 13px; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ek-names { margin: 0; padding-right: 20px; align-self: start; font-size: 17px; font-weight: 700; line-height: 1.3; letter-spacing: -0.012em; color: color-mix(in oklab, var(--foreground) 86%, var(--background)); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; line-clamp: 4; overflow: hidden; mask-image: linear-gradient(to bottom, black 60%, transparent); }

  /* Kategori lain: quiet rows, a thumbnail on the right where the kind has one. */
  .ek-lain { display: grid; gap: 2px; margin-top: 8px; }
  .ek-lain h3 { margin: 0 0 4px; font-size: 15px; font-weight: 700; color: var(--muted-foreground); }
  .ek-lain ul { list-style: none; margin: 0 calc(var(--gutter, 16px) * -1); padding: 0; }
  .ek-lain a { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px var(--gutter, 16px); border-top: 1px solid var(--border); color: inherit; text-decoration: none; transition: background-color 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  .ek-lain li:last-child a { border-bottom: 1px solid var(--border); }
  .ek-lain a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ek-lain a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: -2px; }
  .ek-lain-text { flex: 1; display: grid; gap: 1px; min-width: 0; }
  .ek-lain-text strong { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
  .ek-lain-text small { font-size: 13.5px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ek-lain img { flex: none; width: 48px; height: 48px; border-radius: 12px; object-fit: cover; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .ek-lain a > :global(svg) { flex: none; color: var(--muted-foreground); }
  .ek-credit { margin: 2px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--muted-foreground); }

  .ek-hold { display: grid; gap: 10px; grid-template-columns: 1fr 1fr; }
  .ek-hold span { height: 176px; border-radius: 18px; background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .ek-hold span:first-child { grid-column: 1 / -1; height: 228px; }

  /* From a tablet up, a trio is one large card beside two stacked small ones; every second trio is mirrored. */
  @media (min-width: 600px) {
    .ek-trio.n3 { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); grid-template-rows: repeat(2, minmax(168px, auto)); }
    .ek-trio.n3 > li.big { grid-column: 1; grid-row: 1 / span 2; }
    .ek-trio.n3.mirror > li.big { grid-column: 2; }
    .ek-trio.n3.mirror > li:not(.big) { grid-column: 1; }
    .ek-trio.n2 { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); }
    .ek-trio.n2 > li.big, .ek-trio.n2 > li:not(.big) { grid-column: auto; }
    .big .ek-card { min-height: 100%; }
    .big .ek-title { font-size: 28px; }
    .ek-dots :global(.pkg) { max-width: 300px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ek-plate, .ek-lain a, .ek-card :global(.ek-go) { transition: none; }
  }
</style>
