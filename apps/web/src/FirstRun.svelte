<script lang="ts">
  // The first-run screen (src/first-run.ts on the node): after a first sign-in, pick places and languages and join
  // matching communities. Shown once per account; skipping is always one tap away. The choice itself stays on this
  // device (the first place becomes the Beranda place); the node only records that the screen was shown.
  import { Check, Plus, Search } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { request, type Auth } from './api'
  import type { ContextNode } from './context-tree'
  import { setPlaceScope } from './place-scope.svelte'
  import { notify } from './notifications.svelte'

  type Suggestion = { id: string; title: string; description: string; admission: string; because: string[]; joined: boolean }
  let { auth, onDone, navigate }: { auth: Auth; onDone: () => void; navigate: (href: string) => void } = $props()
  let contexts = $state<ContextNode[] | null>(null),
    chosen = $state<ContextNode[]>([]),
    query = $state(''),
    matched = $state<Suggestion[]>([]),
    general = $state<Suggestion[]>([]),
    joining = $state(''),
    finishing = $state(false)

  const placeKinds = new Set(['region', 'place'])
  const byTitle = (a: ContextNode, b: ContextNode) => a.title.localeCompare(b.title, 'id')
  const regions = $derived((contexts ?? []).filter((c) => c.kind === 'region').sort(byTitle))
  const languages = $derived((contexts ?? []).filter((c) => c.kind === 'language' && (c.indexed ?? 0) > 0).sort(byTitle))
  const found = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2 || !contexts) return []
    return contexts
      .filter((c) => (placeKinds.has(c.kind) || c.kind === 'language') && (c.title.toLowerCase().includes(q) || (c.aliases ?? []).some((a) => a.toLowerCase().includes(q))))
      .sort(byTitle)
      .slice(0, 10)
  })
  const isChosen = (c: ContextNode) => chosen.some((x) => x.id === c.id)
  function toggle(c: ContextNode) {
    chosen = isChosen(c) ? chosen.filter((x) => x.id !== c.id) : chosen.length >= 8 ? chosen : [...chosen, c]
  }

  $effect(() => {
    void request<ContextNode[]>('/v1/contexts', undefined, undefined, true).then((list) => (contexts = list)).catch(() => (contexts = []))
  })
  let generation = 0
  $effect(() => {
    const slugs = chosen.map((c) => c.slug).join(',')
    const mine = ++generation
    void request<{ matched: Suggestion[]; general: Suggestion[] }>('/v1/communities/suggest?contexts=' + encodeURIComponent(slugs), undefined, undefined, true)
      .then((r) => {
        if (mine !== generation) return
        matched = r.matched
        general = r.general
      })
      .catch(() => {})
  })

  async function join(s: Suggestion) {
    if (joining) return
    joining = s.id
    try {
      await request(`/v1/communities/${s.id}/join`, {})
      const mark = (list: Suggestion[]) => list.map((x) => (x.id === s.id ? { ...x, joined: true } : x))
      matched = mark(matched)
      general = mark(general)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Belum dapat bergabung.')
    } finally {
      joining = ''
    }
  }
  async function finish(keep: boolean) {
    if (finishing) return
    finishing = true
    try {
      await request('/auth/first-run', {})
    } catch {
      /* The screen may come back next time; nothing else depends on it. */
    }
    const place = keep ? chosen.find((c) => placeKinds.has(c.kind)) : undefined
    if (place) setPlaceScope({ slug: place.slug, title: place.title })
    onDone()
    navigate('/')
  }
  const firstName = $derived((auth.actor?.name ?? '').split(/\s+/)[0])
</script>

{#snippet chip(c: ContextNode)}
  <button type="button" class="fr-chip" aria-pressed={isChosen(c)} onclick={() => toggle(c)}>
    {#if isChosen(c)}<Check size={14} />{/if}{c.title}
  </button>
{/snippet}

{#snippet row(s: Suggestion)}
  <li class="fr-row">
    <div class="fr-main">
      <a href={'/communities/' + s.id}>{s.title}</a>
      <p>{s.description}</p>
      {#if s.because.length}<small>Cocok dengan {s.because.join(', ')}</small>{/if}
    </div>
    {#if s.joined}
      <span class="fr-joined"><Check size={15} />Sudah bergabung</span>
    {:else if s.admission === 'open'}
      <Button variant="outline" size="sm" disabled={!!joining} onclick={() => join(s)}><Plus size={15} />Gabung</Button>
    {:else}
      <Button variant="ghost" size="sm" href={'/communities/' + s.id}>Lihat</Button>
    {/if}
  </li>
{/snippet}

<div class="first-run">
  {#if !auth.actor}
    <section class="etnos-nodata"><h1>Mulai di ETNOS</h1><p>Masuk dulu untuk memilih tempat, bahasa dan komunitas.</p></section>
  {:else if !contexts}
    <ContentSkeleton />
  {:else}
    <header>
      <h1>Selamat datang{firstName ? ', ' + firstName : ''}</h1>
      <p>Pilih tempat dan bahasa yang dekat denganmu, lalu gabung ke komunitas yang cocok. Semua ini bisa diubah nanti.</p>
    </header>

    <section aria-labelledby="fr-places">
      <h2 id="fr-places">Tempat</h2>
      <p class="cx-hint">Wilayah adat atau provinsi. Tempat pertama yang kamu pilih menjadi tempat di Beranda.</p>
      <div class="fr-chips">{#each regions as c (c.id)}{@render chip(c)}{/each}</div>
    </section>

    {#if languages.length}
      <section aria-labelledby="fr-languages">
        <h2 id="fr-languages">Bahasa</h2>
        <p class="cx-hint">Bahasa yang kamu pakai atau ingin kamu pelajari.</p>
        <div class="fr-chips">{#each languages as c (c.id)}{@render chip(c)}{/each}</div>
      </section>
    {/if}

    <section aria-label="Cari tempat atau bahasa lain">
      <label class="fr-search"><Search size={16} /><Input bind:value={query} placeholder="Cari kabupaten, kota atau bahasa lain" autocomplete="off" /></label>
      {#if found.length}<div class="fr-chips">{#each found as c (c.id)}{@render chip(c)}{/each}</div>{/if}
      {#if chosen.some((c) => !regions.includes(c) && !languages.includes(c))}
        <div class="fr-chips"><span class="fr-label">Pilihanmu</span>{#each chosen.filter((c) => !regions.includes(c) && !languages.includes(c)) as c (c.id)}{@render chip(c)}{/each}</div>
      {/if}
    </section>

    <section aria-labelledby="fr-communities">
      <h2 id="fr-communities">Komunitas untukmu</h2>
      {#if matched.length}
        <ul class="fr-list">{#each matched as s (s.id)}{@render row(s)}{/each}</ul>
        {#if general.length}<p class="cx-hint">Komunitas umum untuk semua anggota</p>{/if}
      {:else if chosen.length}
        <p class="cx-hint">Belum ada komunitas khusus untuk pilihanmu. Kamu bisa mulai dari komunitas umum ini, atau membuat komunitas sendiri nanti.</p>
      {:else}
        <p class="cx-hint">Komunitas umum untuk semua anggota. Pilih tempat atau bahasa untuk melihat yang lebih dekat.</p>
      {/if}
      <ul class="fr-list">{#each general as s (s.id)}{@render row(s)}{/each}</ul>
    </section>

    <footer class="fr-actions">
      <Button disabled={finishing} onclick={() => finish(true)}>Selesai</Button>
      <Button variant="ghost" disabled={finishing} onclick={() => finish(false)}>Lewati</Button>
    </footer>
  {/if}
</div>

<style>
  .first-run { display: grid; gap: 24px; max-width: 720px; padding: 24px 24px 96px; }
  header h1 { margin: 0 0 8px; font-size: 1.6rem; font-weight: 700; line-height: 1.2; }
  header p { margin: 0; font-size: 15.5px; line-height: 1.55; color: var(--muted-foreground); }
  section { display: grid; gap: 10px; }
  h2 { margin: 0; font-size: 1.05rem; font-weight: 650; }
  section > p { margin: 0; }
  .fr-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .fr-label { font-size: 13px; color: var(--muted-foreground); margin-right: 2px; }
  .fr-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 36px; padding: 6px 12px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; cursor: pointer; }
  .fr-chip:not([aria-pressed='true']):hover { background: var(--muted); }
  .fr-chip[aria-pressed='true'] { background: var(--foreground); border-color: var(--foreground); color: var(--background); }
  .fr-chip:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  .fr-search { display: flex; align-items: center; gap: 8px; color: var(--muted-foreground); }
  .fr-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .fr-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
  .fr-main { display: grid; gap: 2px; min-width: 0; }
  .fr-main a { font-weight: 600; font-size: 15px; color: var(--foreground); text-decoration: none; }
  .fr-main p { margin: 0; font-size: 14px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fr-main small { font-size: 12.5px; color: var(--muted-foreground); }
  .fr-joined { display: inline-flex; align-items: center; gap: 5px; font-size: 13.5px; color: var(--muted-foreground); white-space: nowrap; }
  .fr-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  @media (max-width: 767px) { .first-run { padding: 16px 16px 112px; } }
</style>
