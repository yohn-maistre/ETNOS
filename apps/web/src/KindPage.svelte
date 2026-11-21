<script lang="ts">
  // A kind page of the Ensiklopedia, `/wiki/jenis/<kind>` (docs/plan/one-page-system-2026-11-21.md §3a): the
  // entries of one kind, with circles for the sub-kinds that really exist (burung and kupu-kupu under Makhluk hidup,
  // danau and gunung under Bentang alam, rumpun under Bahasa), and filters for writing status and place. `semua`
  // lists every kind, which is where the front's Lihat semua links land. Filters live in the address (`?sub=`,
  // `?status=belum|ditulis|diperiksa`, `?di=<slug>`), so a filtered list can be shared and Back works.
  import { onMount } from 'svelte'
  import { ArrowUpRight, X } from '@lucide/svelte'
  import { KIND_NAME, inScope, loadIndex, shortCount, type EntryIndex, type IndexEntry } from './entri'
  import { placeScope } from './place-scope.svelte'
  import { loadViewerObjects, viewerListHref, ENTRY_KIND_RECORDS, viewerList, type ViewerObject } from './viewer-data.ts'
  import { OBSERVATORY_NAME, VIEWER_NAME } from './observatory-name.ts'
  import './styles/observatorium.css'

  let { kind, search = '' }: { kind: string; search?: string } = $props()
  let index = $state<EntryIndex | null>(null),
    failed = $state(false),
    objects = $state<ViewerObject[]>([]),
    shown = $state(60)
  onMount(() => {
    loadIndex().then((i) => (index = i)).catch(() => (failed = true))
    void loadViewerObjects().then((o) => (objects = o))
  })

  const q = $derived(new URLSearchParams(search))
  const sub = $derived(q.get('sub') ?? '')
  const status = $derived(q.get('status') ?? '')
  const di = $derived(q.get('di') ?? '')
  $effect(() => { void kind; void search; shown = 60 })
  const name = $derived(KIND_NAME[kind] ?? 'Entri')
  $effect(() => { document.title = name + ' · ' + OBSERVATORY_NAME + ' · ETNOS' })

  const ofKind = $derived((index?.entries ?? []).filter((e) => kind === 'semua' || e.kind === kind))
  const subs = $derived(kind === 'semua' ? [] : (index?.subs[kind] ?? []))
  const where = $derived(di ? index?.entries.find((e) => e.slug === di) ?? null : null)
  const list = $derived.by(() => {
    let rows = ofKind
    if (sub) rows = rows.filter((e) => e.subKey === sub)
    if (di) rows = rows.filter((e) => e.slug !== di && inScope(e, di))
    if (status === 'belum') rows = rows.filter((e) => !e.article)
    if (status === 'ditulis') rows = rows.filter((e) => e.article)
    if (status === 'diperiksa') rows = rows.filter((e) => e.reviewed).sort((a, b) => (b.reviewed?.at ?? 0) - (a.reviewed?.at ?? 0))
    return rows
  })
  const records = $derived(ENTRY_KIND_RECORDS[kind] ? viewerList('jenis-' + kind, objects) : [])
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams(search)
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k)
    const s = p.toString()
    return '/wiki/jenis/' + kind + (s ? '?' + s : '')
  }
  const STATUS: [string, string][] = [['', 'Semua'], ['ditulis', 'Sudah ada tulisan'], ['belum', 'Belum ada tulisan'], ['diperiksa', 'Sudah diperiksa']]
  const meta = (e: IndexEntry) => [kind === 'semua' ? KIND_NAME[e.kind] : null, e.sub && e.sub !== KIND_NAME[e.kind] ? e.sub : null, e.article ? null : 'belum ada tulisan'].filter(Boolean).join(' · ')
</script>

<div class="obs kp">
  <header class="obs-section obs-top kp-top">
    <p class="kp-crumb"><a href="/wiki">{OBSERVATORY_NAME}</a></p>
    <h1>{name}</h1>
    {#if index}<p class="obs-lede">{kind === 'lembaga' ? shortCount(index.lembaga.length) + ' lembaga publik' : kind === 'kamus' ? shortCount(index.kamus.length) + ' kamus komunitas' : shortCount(ofKind.length) + ' entri'}</p>{/if}
  </header>

  {#if failed}<p class="obs-note kp-pad">Daftar ini belum dapat dimuat. Coba muat ulang halaman.</p>
  {:else if !index}<div class="obs-skeleton kp-pad" aria-hidden="true"></div>
  {:else if kind === 'lembaga'}
    <section class="obs-section"><ul class="obs-rows">
        {#each index.lembaga as g (g.id)}<li><a class="obs-row" href={g.href}><span class="obs-row-main"><span class="obs-row-title">{g.title}</span><span class="obs-row-meta">Lembaga</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>
        {:else}<li><p class="obs-note">Belum ada lembaga publik.</p></li>{/each}
      </ul></section>
  {:else if kind === 'kamus'}
    <section class="obs-section"><ul class="obs-rows">
        {#each index.kamus as k (k.communityId)}<li><a class="obs-row" href={'/communities/' + k.communityId + '?tab=kamus'}><span class="obs-row-main"><span class="obs-row-title">Kamus {k.languageName}</span><span class="obs-row-meta">{k.title} · {k.entries ? shortCount(k.entries) + ' kata' : 'belum ada kata'}</span></span><ArrowUpRight size={16} aria-hidden="true" /></a></li>
        {:else}<li><p class="obs-note">Belum ada kamus komunitas yang publik.</p></li>{/each}
      </ul></section>
  {:else}
    {#if subs.length > 1}<nav class="kp-subs" aria-label={'Jenis ' + name.toLowerCase()}>
        <ul>
          <li><a href={href({ sub: '' })} aria-current={!sub ? 'page' : undefined}><span class="kp-circle">{shortCount(ofKind.length)}</span><span>Semua</span></a></li>
          {#each subs as s (s.key)}<li><a href={href({ sub: s.key })} aria-current={sub === s.key ? 'page' : undefined}><span class="kp-circle">{shortCount(s.count)}</span><span>{s.label}</span></a></li>{/each}
        </ul>
      </nav>{/if}

    {#if records.length}<section class="obs-section kp-records" aria-labelledby="kp-rec-title">
        <div class="obs-head"><h2 id="kp-rec-title">Di {VIEWER_NAME}</h2><a class="obs-more" href={viewerListHref(records[0].id, 'jenis-' + kind) + '&semua=1'}>Lihat semua</a></div>
        <ul class="kp-thumbs">{#each records as o (o.id)}<li><a href={viewerListHref(o.id, 'jenis-' + kind)} title={o.title}>{#if o.thumb}<img src={o.thumb} alt="" loading="lazy" width="72" height="72" />{/if}<span>{o.title}</span></a></li>{/each}</ul>
      </section>{/if}

    <section class="obs-section kp-list" aria-labelledby="kp-list-title">
      <h2 id="kp-list-title" class="sr-only">Daftar {name.toLowerCase()}</h2>
      <div class="kp-filters">
        <div class="obs-chips" role="group" aria-label="Saring menurut tulisan">
          {#each STATUS as [key, label] (key)}<a href={href({ status: key })} aria-current={status === key ? 'true' : undefined}>{label}</a>{/each}
        </div>
        {#if di}<a class="kp-place" href={href({ di: '' })} aria-label={'Hapus saringan tempat ' + (where?.title ?? di)}>Di {where?.title ?? di}<X size={14} aria-hidden="true" /></a>
        {:else if placeScope.slug}<a class="kp-place off" href={href({ di: placeScope.slug })}>Hanya di {placeScope.title}</a>{/if}
      </div>
      {#if list.length}<ul class="obs-rows">
          {#each list.slice(0, shown) as e (e.slug)}<li><a class="obs-row" href={e.href}>{#if e.thumb}<img class="kp-thumb" src={e.thumb} alt="" loading="lazy" width="44" height="44" />{/if}<span class="obs-row-main"><span class="obs-row-title">{e.title}</span>{#if meta(e)}<span class="obs-row-meta">{meta(e)}</span>{/if}</span><ArrowUpRight size={16} aria-hidden="true" /></a></li>{/each}
        </ul>
        {#if list.length > shown}<button type="button" class="kp-more" onclick={() => (shown += 120)}>Tampilkan {Math.min(120, list.length - shown)} lagi dari {shortCount(list.length - shown)}</button>{/if}
      {:else}<p class="obs-note">Tidak ada entri yang cocok dengan saringan ini.</p>{/if}
    </section>
  {/if}
</div>

<style>
  .kp-top { gap: 6px; padding-bottom: 14px; }
  .kp-top h1 { margin: 0; font-size: 30px; font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }
  .kp-crumb { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .kp-crumb a { color: inherit; text-decoration: none; }
  .kp-crumb a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .kp-pad { margin: 0 var(--gutter); }
  .kp-subs { padding: 4px 0 18px; }
  .kp-subs ul { display: flex; gap: 6px; margin: 0; padding: 2px var(--gutter); overflow-x: auto; scrollbar-width: none; list-style: none; }
  .kp-subs li { flex: none; }
  .kp-subs a { display: flex; flex-direction: column; align-items: center; gap: 7px; width: 84px; padding: 4px 0; color: var(--foreground); text-decoration: none; text-align: center; font-size: 13px; font-weight: 600; line-height: 1.25; }
  .kp-circle { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 999px; background: color-mix(in oklab, var(--foreground) 6%, var(--background)); font-size: 15px; font-weight: 750; font-variant-numeric: tabular-nums; }
  .kp-subs a:hover .kp-circle { background: color-mix(in oklab, var(--foreground) 10%, var(--background)); }
  .kp-subs a[aria-current='page'] .kp-circle { background: var(--foreground); color: var(--background); }
  .kp-subs a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; border-radius: 12px; }
  .kp-subs a > span:last-child { overflow-wrap: anywhere; }
  .kp-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .kp-filters .obs-chips a[aria-current='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .kp-place { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px 0 14px; border-radius: 999px; background: var(--foreground); color: var(--background); font-size: 14px; font-weight: 600; text-decoration: none; }
  .kp-place.off { background: transparent; color: var(--foreground); border: 1px dashed var(--border); }
  .kp-thumb { flex: none; width: 44px; height: 44px; border-radius: 10px; object-fit: cover; background: var(--secondary); }
  .kp-thumbs { display: flex; gap: 10px; margin: 0 calc(var(--gutter) * -1); padding: 2px var(--gutter); overflow-x: auto; scrollbar-width: none; list-style: none; }
  .kp-thumbs a { display: grid; gap: 6px; width: 104px; color: inherit; text-decoration: none; font-size: 13.5px; font-weight: 600; line-height: 1.25; }
  .kp-thumbs img { width: 104px; height: 104px; border-radius: 14px; object-fit: cover; background: var(--secondary); }
  .kp-thumbs a:hover span { text-decoration: underline; text-underline-offset: 3px; }
  .kp-more { justify-self: start; min-height: 40px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .kp-more:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
</style>
