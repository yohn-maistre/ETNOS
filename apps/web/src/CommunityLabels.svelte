<script lang="ts" module>
  export type LabelCtx = { id: string; slug: string; title: string; kind: string; facet?: string; role?: 'about' | 'language' }
</script>

<script lang="ts">
  // The three optional fields of a community (docs/plan/one-page-system-2026-11-21.md §6), in one place: at creation
  // (no communityId: the choices are bound and sent with the founding request) and in the community settings (with a
  // communityId: each change is saved at once). "Tentang apa atau di mana" picks places, topics and peoples;
  // "Bahasa yang dipakai" picks the languages people write in, and a Papuan language switches the Kamus on;
  // "Dikelola oleh" shows only to a steward of a lembaga. A hidden community carries no public labels.
  import { X, MapPin, Hash, Languages, Building2 } from '@lucide/svelte'
  import Choice from './Choice.svelte'
  import { request } from './api'

  type Lembaga = { id: string; title: string; kind: string; visibility: string }
  let {
    communityId = '',
    hidden = false,
    about = $bindable<LabelCtx[]>([]),
    languages = $bindable<LabelCtx[]>([]),
    groupId = $bindable(''),
    onSaved,
  }: { communityId?: string; hidden?: boolean; about?: LabelCtx[]; languages?: LabelCtx[]; groupId?: string; onSaved?: () => void } = $props()
  const uid = $props.id()
  const live = $derived(!!communityId)
  const CONTACT = new Set(['papu1250', 'indo1316', 'stan1306', 'mala1479'])
  let all = $state<(LabelCtx & { aliases?: string[] })[]>([]),
    mine = $state<Lembaga[]>([]),
    current = $state<{ id: string; title: string } | null>(null),
    aboutQuery = $state(''),
    languageQuery = $state(''),
    busy = $state(false),
    problem = $state('')

  $effect(() => {
    const id = communityId,
      abort = new AbortController()
    problem = ''
    request<(LabelCtx & { aliases?: string[] })[]>('/v1/contexts', undefined, abort.signal, true).then((c) => (all = c)).catch(() => (problem = 'Daftar label belum dapat dimuat.'))
    request<Lembaga[]>('/v1/my-lembaga', undefined, abort.signal, true).then((g) => (mine = g)).catch(() => (mine = []))
    if (id)
      request<{ contexts?: LabelCtx[]; group?: { id: string; title: string } | null }>('/v1/communities/' + id, undefined, abort.signal, true)
        .then((c) => {
          about = (c.contexts ?? []).filter((x) => x.role !== 'language')
          languages = (c.contexts ?? []).filter((x) => x.role === 'language')
          current = c.group ?? null
          groupId = c.group?.id ?? ''
        })
        .catch(() => {})
    return () => abort.abort()
  })
  const glotto = (c: { aliases?: string[] }) => c.aliases?.find((a) => a.startsWith('glottocode:'))?.slice(11) ?? ''
  const kamusOn = $derived(languages.some((l) => !CONTACT.has(glotto(all.find((a) => a.id === l.id) ?? {}))))
  const search = (q: string, pool: LabelCtx[], held: LabelCtx[]) => {
    const t = q.trim().toLowerCase()
    if (t.length < 2) return []
    const ids = new Set(held.map((h) => h.id))
    return pool.filter((c) => !ids.has(c.id) && c.title.toLowerCase().includes(t)).sort((a, b) => Number(!a.title.toLowerCase().startsWith(t)) - Number(!b.title.toLowerCase().startsWith(t)) || a.title.localeCompare(b.title, 'id')).slice(0, 8)
  }
  const aboutPool = $derived(all.filter((c) => c.facet !== 'community-kind' && c.facet !== 'institution-kind'))
  const languagePool = $derived(all.filter((c) => c.kind === 'language'))
  const aboutMatches = $derived(search(aboutQuery, aboutPool, [...about, ...languages]))
  const languageMatches = $derived(search(languageQuery, languagePool, languages))
  const kindName = (c: LabelCtx) => (c.kind === 'place' ? 'Kabupaten atau kota' : c.kind === 'region' ? 'Wilayah' : c.kind === 'language' ? 'Bahasa sebagai topik' : 'Topik')

  async function change(c: LabelCtx, role: 'about' | 'language', remove: boolean) {
    problem = ''
    if (!live) {
      const list = role === 'about' ? about : languages
      const next = remove ? list.filter((x) => x.id !== c.id) : list.length >= 10 ? list : [...list, { ...c, role }]
      if (role === 'about') about = next
      else languages = next
      if (role === 'about') aboutQuery = ''
      else languageQuery = ''
      return
    }
    if (busy) return
    busy = true
    try {
      const labels = await request<LabelCtx[]>('/v1/communities/' + communityId + '/contexts', { contextId: c.id, remove, role })
      about = labels.filter((x) => x.role !== 'language')
      languages = labels.filter((x) => x.role === 'language')
      if (role === 'about') aboutQuery = ''
      else languageQuery = ''
      onSaved?.()
    } catch (e) {
      problem = e instanceof Error ? e.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
  async function setGroup(value: string) {
    groupId = value
    if (!live) return
    busy = true
    problem = ''
    try {
      current = await request<{ id: string; title: string } | null>('/v1/communities/' + communityId + '/group', { groupId: value || null }).then((r) => (value ? (r as { id: string; title: string }) : null))
      onSaved?.()
    } catch (e) {
      problem = e instanceof Error ? e.message : 'Belum tersimpan.'
      groupId = current?.id ?? ''
    } finally {
      busy = false
    }
  }
  const groupChoices = $derived([
    { value: '', label: 'Tidak dikelola lembaga' },
    ...mine.map((g) => ({ value: g.id, label: g.title })),
    ...(current && !mine.some((g) => g.id === current!.id) ? [{ value: current.id, label: current.title }] : []),
  ])
</script>

{#snippet picker(role: 'about' | 'language', held: LabelCtx[], matches: LabelCtx[])}
  {#if held.length}<ul class="cl-held" aria-label={role === 'about' ? 'Tentang apa atau di mana' : 'Bahasa yang dipakai'}>
      {#each held as c (c.id)}<li>
          {#if c.kind === 'place' || c.kind === 'region'}<MapPin size={13} aria-hidden="true" />{:else if c.kind === 'language'}<Languages size={13} aria-hidden="true" />{:else}<Hash size={13} aria-hidden="true" />{/if}
          <span>{c.title}</span>
          <button type="button" disabled={busy} aria-label={'Lepas ' + c.title} onclick={() => change(c, role, true)}><X size={14} /></button>
        </li>{/each}
    </ul>{/if}
  {#if matches.length}<ul class="cl-matches">
      {#each matches as c (c.id)}<li><button type="button" disabled={busy} onclick={() => change(c, role, false)}><span>{c.title}</span><small>{role === 'language' ? 'Bahasa' : kindName(c)}</small></button></li>{/each}
    </ul>{/if}
{/snippet}

<div class="cl" class:draft={!live}>
  {#if hidden}
    <p class="cl-note">Komunitas tersembunyi tidak memakai label publik, jadi tidak tampil di halaman tempat atau bahasa. Pengelola situs dapat menyalakan Kamus untuk komunitas ini.</p>
  {:else}
    <div class="cl-field">
      <label for={uid + '-about'}>Tentang apa atau di mana</label>
      <p class="cl-hint">Pilih tempat, topik atau suku. Komunitas ini akan tampil di halaman itu dan wilayah di atasnya.</p>
      <input id={uid + '-about'} type="search" bind:value={aboutQuery} placeholder="Dogiyai, kopi, Mee…" autocomplete="off" />
      {@render picker('about', about, aboutMatches)}
      {#if aboutQuery.trim().length >= 2 && all.length && !aboutMatches.length}<p class="cl-hint">Tidak ada yang cocok di katalog.</p>{/if}
    </div>
    <div class="cl-field">
      <label for={uid + '-lang'}>Bahasa yang dipakai</label>
      <p class="cl-hint">Bahasa Indonesia tidak perlu dipilih. Pilih bahasa daerah yang dipakai orang untuk menulis di sini.</p>
      <input id={uid + '-lang'} type="search" bind:value={languageQuery} placeholder="Ekari, Biak, Dani…" autocomplete="off" />
      {@render picker('language', languages, languageMatches)}
      {#if kamusOn}<p class="cl-kamus">{live ? 'Kamus komunitas menyala untuk bahasa ini.' : 'Kamus komunitas akan menyala.'} Anggota dapat menanyakan dan mencatat arti kata dari percakapan.</p>{/if}
    </div>
  {/if}
  {#if mine.length || current}
    <div class="cl-field">
      <label for={uid + '-group'}><Building2 size={14} aria-hidden="true" />Dikelola oleh</label>
      <Choice id={uid + '-group'} value={groupId} items={groupChoices} onchange={(v: string) => setGroup(v)} />
      <p class="cl-hint">Komunitas ini akan tampil di halaman lembaga itu.</p>
    </div>
  {/if}
  {#if problem}<p class="cl-problem" role="alert">{problem}</p>{/if}
</div>

<style>
  .cl { display: grid; gap: 22px; }
  .cl.draft { padding-top: 14px; }
  .cl-field { display: grid; gap: 6px; }
  .cl-field > label { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; }
  .cl-hint, .cl-note { margin: 0; font-size: 13px; line-height: 1.45; color: var(--muted-foreground); }
  .cl-note { font-size: 13.5px; }
  .cl-kamus { margin: 0; padding: 8px 12px; border-radius: 12px; background: color-mix(in oklab, var(--brand) 9%, transparent); font-size: 13.5px; line-height: 1.45; }
  .cl-problem { margin: 0; font-size: 13.5px; color: var(--destructive); }
  input { min-height: 44px; padding: 0 12px; border: 1px solid var(--input); border-radius: 12px; background: var(--card); color: inherit; font: inherit; font-size: 16px; }
  input:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }
  .cl-held { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 0; padding: 0; list-style: none; }
  .cl-held li { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 0 4px 0 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13.5px; }
  .cl-held button { display: inline-grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 999px; background: none; color: var(--muted-foreground); cursor: pointer; }
  .cl-held button:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); color: var(--foreground); }
  .cl-matches { margin: 0; padding: 0; list-style: none; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .cl-matches li + li { border-top: 1px solid var(--border); }
  .cl-matches button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 0 12px; background: none; border: 0; color: inherit; font: inherit; font-size: 14.5px; text-align: left; cursor: pointer; }
  .cl-matches button:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .cl-matches small { color: var(--muted-foreground); font-size: 13px; }
  .cl button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: -2px; }
</style>
