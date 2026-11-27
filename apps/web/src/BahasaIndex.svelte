<script lang="ts">
  // The one index of languages (/wiki/jenis/bahasa), map-first (docs/plan/bahasa-consolidation-2026-11-28.md).
  // The map is Peta Kata's own map with every language of the catalogue at its Glottolog point: a filled point in
  // its family colour where the language has words, a faint ring where it has none. A tap opens a card that leads
  // to the language's one page. Under the map, the families and the filters, then every language as a row.
  // `?ada=kamus` (also /wiki/jenis/kamus, which lands here) keeps the languages that have words and links each
  // row to the Kamus tab of its page. Filters live in the address, so a filtered list can be shared.
  import { onMount } from 'svelte'
  import { ArrowUpRight, X } from '@lucide/svelte'
  import { request } from './api'
  import { shortCount, inScope, type EntryIndex, type IndexEntry } from './entri'
  import { placeScope } from './place-scope.svelte'
  import { OBSERVATORY_NAME } from './observatory-name.ts'
  import PetaKataMap, { type WordPoint } from './PetaKataMap.svelte'
  import atlas from './papua-atlas.json'
  import './styles/observatorium.css'

  type Lang = { code: string; slug: string; name: string; family: string; concepts: number; community: { id: string; title: string } | null }
  let { index, failed = false, search = '', kamusFirst = false }: { index: EntryIndex | null; failed?: boolean; search?: string; kamusFirst?: boolean } = $props()

  const REGIONS: Record<string, string> = { domberai: 'Domberai', bomberai: 'Bomberai', saireri: 'Saireri', 'mamta-tabi': 'Mamta / Tabi', meepago: 'Mee Pago', 'la-pago': 'La Pago', 'ha-anim': 'Ha Anim' }
  const atlasLangs = atlas.langs as [string, number, number, string][]
  let langs = $state<Lang[]>([]), langsFailed = $state(false), selected = $state(''), shown = $state(80)
  onMount(() => {
    request<{ languages: Lang[] }>('/v1/peta-kata/concepts', undefined, undefined, true).then((r) => (langs = r.languages)).catch(() => (langsFailed = true))
  })

  const q = $derived(new URLSearchParams(search))
  const sub = $derived(q.get('sub') ?? '')
  const status = $derived(q.get('status') ?? '')
  const di = $derived(q.get('di') ?? '')
  const ada = $derived(kamusFirst || q.get('ada') === 'kamus')
  $effect(() => { void search; shown = 80 })
  $effect(() => { document.title = (ada ? 'Kamus' : 'Bahasa') + ' · ' + OBSERVATORY_NAME + ' · ETNOS' })

  const bySlug = $derived(new Map(langs.map((l) => [l.slug, l])))
  // Words per language: published wordlists and Peta Kata's community words (langs), plus the community Kamus.
  const books = $derived.by(() => {
    const m = new Map<string, { communityId: string; title: string; entries: number }[]>()
    for (const k of index?.kamus ?? []) if (k.languageSlug) m.set(k.languageSlug, [...(m.get(k.languageSlug) ?? []), k])
    return m
  })
  const hasWords = (slug: string) => (bySlug.get(slug)?.concepts ?? 0) > 0 || books.has(slug)

  // A group of languages (Rumpun bahasa Dani, Bahasa-bahasa Yapen) is not one language: it is linked under the list.
  const ofKind = $derived((index?.entries ?? []).filter((e) => e.kind === 'bahasa' && e.subKey !== 'kelompok'))
  const groups = $derived((index?.entries ?? []).filter((e) => e.kind === 'bahasa' && e.subKey === 'kelompok').sort((a, b) => a.title.localeCompare(b.title, 'id')))
  const subs = $derived(index?.subs.bahasa ?? [])
  const where = $derived(di ? index?.entries.find((e) => e.slug === di) ?? null : null)
  const list = $derived.by(() => {
    let rows = ofKind
    if (sub) rows = rows.filter((e) => e.subKey === sub)
    if (di) rows = rows.filter((e) => e.slug !== di && inScope(e, di))
    if (ada) rows = rows.filter((e) => hasWords(e.slug))
    if (status === 'belum') rows = rows.filter((e) => !e.article)
    if (status === 'ditulis') rows = rows.filter((e) => e.article)
    if (status === 'diperiksa') rows = rows.filter((e) => e.reviewed)
    return rows
  })
  const listed = $derived(new Set(list.map((e) => e.slug)))
  const withWords = $derived(ofKind.filter((e) => hasWords(e.slug)).length)
  // With ?ada=kamus the family circles count only the languages that have words.
  const subWords = $derived.by(() => {
    const n = new Map<string, number>()
    for (const e of ofKind) if (e.subKey && hasWords(e.slug)) n.set(e.subKey, (n.get(e.subKey) ?? 0) + 1)
    return n
  })

  // The three families with the most languages get a colour each, as on Peta Kata.
  const familySlots = $derived.by(() => {
    const n = new Map<string, number>()
    for (const l of langs) if (l.family) n.set(l.family, (n.get(l.family) ?? 0) + 1)
    return new Map([...n].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f], i) => [f, i + 1]))
  })
  const points = $derived.by<WordPoint[]>(() =>
    atlasLangs.flatMap(([slug, x, y, region]) => {
      const l = bySlug.get(slug)
      if (!l) return []
      const lit = hasWords(slug) && listed.has(slug)
      return [{ code: slug, name: l.name, x, y, region, slot: familySlots.get(l.family) ?? 0, form: lit ? l.name : '', richness: l.concepts }]
    }),
  )
  const legend = $derived.by(() => {
    const counts = [0, 0, 0, 0]
    let none = 0
    for (const p of points) { if (p.form) counts[p.slot]!++; else none++ }
    const names = [...familySlots.entries()].sort((a, b) => a[1] - b[1]).map(([f]) => f)
    return { rows: [...names.map((f, i) => ({ slot: i + 1, label: 'Rumpun ' + f, count: counts[i + 1]! })), { slot: 0, label: 'Rumpun lain', count: counts[0]! }], none }
  })
  const focus = $derived(REGIONS[di] ? di : '')
  const pick = $derived(selected ? bySlug.get(selected) ?? null : null)
  const pickEntry = $derived(selected ? ofKind.find((e) => e.slug === selected) ?? null : null)

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams(search)
    if (kamusFirst) p.set('ada', 'kamus')
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k)
    const s = p.toString()
    return '/wiki/jenis/bahasa' + (s ? '?' + s : '')
  }
  const STATUS: [string, string][] = [['', 'Semua'], ['ditulis', 'Sudah ada tulisan'], ['belum', 'Belum ada tulisan'], ['diperiksa', 'Sudah diperiksa']]
  const fmt = (n: number) => n.toLocaleString('id-ID')
  const meta = (e: IndexEntry) => {
    const l = bySlug.get(e.slug), b = books.get(e.slug) ?? []
    return [e.sub ? 'Rumpun ' + e.sub : 'Rumpun belum diklasifikasikan', l?.concepts ? l.concepts + ' kata dasar' : '', b.length ? 'kamus komunitas ' + b.map((k) => k.title).join(', ') : '', e.article ? '' : 'belum ada tulisan'].filter(Boolean).join(' · ')
  }
  const rowHref = (e: IndexEntry) => e.href + (ada ? '?tab=kamus' : '')
</script>

<div class="obs kp bi">
  <header class="obs-section obs-top bi-top">
    <p class="bi-crumb"><a href="/wiki">{OBSERVATORY_NAME}</a>{#if ada}<span class="bi-sep" aria-hidden="true">›</span><a href="/wiki/jenis/bahasa">Bahasa</a>{/if}</p>
    <h1>{ada ? 'Kamus' : 'Bahasa'}</h1>
    {#if index}<p class="obs-lede">{ada ? fmt(withWords) + ' bahasa punya kata di ETNOS. Kamus setiap bahasa ada di halaman bahasanya.' : fmt(ofKind.length) + ' bahasa di Tanah Papua, ' + fmt(withWords) + ' di antaranya punya kata di ETNOS.'}</p>{/if}
  </header>

  {#if failed}<p class="obs-note bi-pad">Daftar ini belum dapat dimuat. Coba muat ulang halaman.</p>
  {:else if !index}<div class="obs-skeleton bi-pad" aria-hidden="true"></div>
  {:else}
    <section class="obs-section bi-map" aria-labelledby="bi-map-title">
      <h2 id="bi-map-title" class="sr-only">Peta bahasa</h2>
      <div class="bi-stage" aria-busy={!langs.length}>
        <PetaKataMap {atlas} {points} {focus} {selected} onpick={(slug) => (selected = selected === slug ? '' : slug)} />
        {#if langsFailed}<p class="bi-map-note" role="alert">Titik bahasa belum dapat dimuat.</p>{/if}
      </div>
      <ul class="bi-legend" aria-label="Arti warna titik">
        {#each legend.rows.filter((r) => r.count) as r (r.slot)}<li><i class="bi-dot f{r.slot}" aria-hidden="true"></i>{r.label} <small>{fmt(r.count)}</small></li>{/each}
        <li><i class="bi-ring" aria-hidden="true"></i>{ada || sub || di || status ? 'Belum ada kata atau di luar saringan' : 'Belum ada kata'} <small>{fmt(legend.none)}</small></li>
      </ul>

      {#if pick}
        {@const b = books.get(pick.slug) ?? []}
        <article class="bi-card" aria-labelledby="bi-card-title">
          <div class="bi-card-head">
            <div>
              <h3 id="bi-card-title">{pick.name}</h3>
              <p>{[pick.family ? 'Rumpun ' + pick.family : 'Rumpun belum diklasifikasikan', pick.concepts ? pick.concepts + ' dari 100 kata dasar' : 'belum ada kata dasar', ...b.map((k) => 'kamus ' + k.title + ' (' + fmt(k.entries) + ' kata)')].join(' · ')}</p>
            </div>
            <button type="button" class="bi-icon" aria-label="Tutup kartu bahasa" onclick={() => (selected = '')}><X size={18} /></button>
          </div>
          <div class="bi-actions">
            <a class="bi-btn primary" href={'/wiki/' + pick.slug}>Halaman bahasa</a>
            {#if hasWords(pick.slug)}<a class="bi-btn" href={'/wiki/' + pick.slug + '?tab=kamus'}>Kamus</a>{/if}
            {#if pick.concepts}<a class="bi-btn" href={'/wiki/peta-kata?bahasa=' + pick.code}>Di Peta Kata</a>{/if}
          </div>
          {#if pickEntry && !pickEntry.article}<p class="bi-card-foot">Belum ada tulisan tentang {pick.name}.</p>{/if}
        </article>
      {:else}
        <p class="bi-hint">Ketuk titik di peta untuk membuka bahasanya, atau pilih dari daftar di bawah.</p>
      {/if}

      <div class="bi-lenses" aria-label="Alat bahasa">
        <a href="/wiki/peta-kata">Peta Kata<small>kata dasar di peta</small></a>
        <a href="/wiki/peta-kata?tampilan=makna">Ruang makna<small>kata yang berdekatan artinya</small></a>
        {#if !ada}<a href={href({ ada: 'kamus' })}>Kamus<small>{fmt(withWords)} bahasa punya kata</small></a>{/if}
      </div>
    </section>

    {#if subs.length > 1}<nav class="kp-subs" aria-label="Rumpun bahasa">
        <ul>
          <li><a href={href({ sub: '' })} aria-current={!sub ? 'page' : undefined}><span class="kp-circle">{shortCount(ada ? withWords : ofKind.length)}</span><span>Semua</span></a></li>
          {#each subs as s (s.key)}{@const n = ada ? (subWords.get(s.key) ?? 0) : s.count}{#if n || sub === s.key}<li><a href={href({ sub: s.key })} aria-current={sub === s.key ? 'page' : undefined}><span class="kp-circle">{shortCount(n)}</span><span>{s.label}</span></a></li>{/if}{/each}
        </ul>
      </nav>{/if}

    <section class="obs-section kp-list" aria-labelledby="bi-list-title">
      <h2 id="bi-list-title" class="sr-only">Daftar bahasa</h2>
      <div class="kp-filters">
        <div class="obs-chips" role="group" aria-label="Saring menurut kata">
          <a href={href({ ada: '' })} aria-current={!ada ? 'true' : undefined}>Semua bahasa</a>
          <a href={href({ ada: 'kamus' })} aria-current={ada ? 'true' : undefined}>Punya kata</a>
        </div>
        <div class="obs-chips" role="group" aria-label="Saring menurut tulisan">
          {#each STATUS as [key, label] (key)}<a href={href({ status: key })} aria-current={status === key ? 'true' : undefined}>{label}</a>{/each}
        </div>
        {#if di}<a class="kp-place" href={href({ di: '' })} aria-label={'Hapus saringan tempat ' + (where?.title ?? di)}>Di {where?.title ?? di}<X size={14} aria-hidden="true" /></a>
        {:else if placeScope.slug}<a class="kp-place off" href={href({ di: placeScope.slug })}>Hanya di {placeScope.title}</a>{/if}
      </div>
      {#if list.length}<ul class="obs-rows">
          {#each list.slice(0, shown) as e (e.slug)}<li><a class="obs-row" href={rowHref(e)}><span class="obs-row-main"><span class="obs-row-title">{e.title}</span><span class="obs-row-meta">{meta(e)}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
        </ul>
        {#if list.length > shown}<button type="button" class="kp-more" onclick={() => (shown += 120)}>Tampilkan {Math.min(120, list.length - shown)} lagi dari {shortCount(list.length - shown)}</button>{/if}
      {:else}<p class="obs-note">Tidak ada bahasa yang cocok dengan saringan ini.</p>{/if}
      {#if groups.length && !ada}<p class="obs-foot">Ada juga halaman tentang kelompok bahasa, yaitu {#each groups as g, i (g.slug)}{i ? (i === groups.length - 1 ? ' dan ' : ', ') : ''}<a href={g.href}>{g.title}</a>{/each}. Kelompok ini tidak dihitung sebagai satu bahasa.</p>{/if}
      <p class="obs-foot">Titik bahasa dari Glottolog 5.4 (CC BY 4.0). Titik itu menandai letak acuan, bukan batas wilayah bahasa. Kata dasar dari daftar kata terbitan dan dari kamus komunitas publik.</p>
    </section>
  {/if}
</div>

<style>
  .bi-top { gap: 6px; padding-bottom: 14px; }
  .bi-top h1 { margin: 0; font-size: 30px; font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }
  .bi-crumb { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .bi-crumb a { color: inherit; text-decoration: none; }
  .bi-sep { margin: 0 6px; }
  .bi-crumb a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .bi-pad { margin: 0 var(--gutter); }
  .bi-map { display: grid; gap: 12px; padding-top: 4px; min-width: 0; }
  .bi-stage { position: relative; min-width: 0; }
  .bi-map-note { position: absolute; left: 12px; bottom: 12px; margin: 0; padding: 6px 10px; border-radius: 10px; background: var(--background); font-size: 13px; }
  .bi-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0; padding: 0; list-style: none; font-size: 13.5px; }
  .bi-legend li { display: inline-flex; align-items: center; gap: 7px; }
  .bi-legend small { font-size: 13px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .bi-dot { flex: none; width: 10px; height: 10px; border-radius: 50%; background: var(--pk-other); }
  .bi-dot.f1 { background: var(--pk-f1); }
  .bi-dot.f2 { background: var(--pk-f2); }
  .bi-dot.f3 { background: var(--pk-f3); }
  .bi-ring { flex: none; width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid color-mix(in oklab, var(--foreground) 35%, transparent); }
  .bi-hint { margin: 0; font-size: 14px; color: var(--muted-foreground); }
  .bi-card { display: grid; gap: 12px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 16px; }
  .bi-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .bi-card h3 { margin: 0; font-size: 18px; font-weight: 750; letter-spacing: -0.012em; }
  .bi-card p { margin: 2px 0 0; font-size: 13.5px; line-height: 1.4; color: var(--muted-foreground); }
  .bi-card-foot { margin: 0 !important; }
  .bi-icon { flex: none; display: grid; place-items: center; width: 36px; height: 36px; margin: -6px -8px 0 0; border: 0; border-radius: 999px; background: transparent; color: var(--foreground); cursor: pointer; }
  .bi-icon:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); }
  .bi-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .bi-btn { display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 14px; font-weight: 600; text-decoration: none; }
  .bi-btn:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .bi-btn.primary { border-color: var(--foreground); background: var(--foreground); color: var(--background); }
  .bi-btn.primary:hover { background: color-mix(in oklab, var(--foreground) 88%, var(--background)); }
  .bi-lenses { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 8px; }
  .bi-lenses a { display: grid; gap: 2px; padding: 12px 14px; border: 1px solid var(--border); border-radius: 14px; color: var(--foreground); font-size: 15px; font-weight: 700; text-decoration: none; }
  .bi-lenses a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .bi-lenses small { font-size: 13px; font-weight: 400; color: var(--muted-foreground); }
  .bi-btn:focus-visible, .bi-lenses a:focus-visible, .bi-icon:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  :global(.bi .kp-filters) { row-gap: 10px; }
</style>
