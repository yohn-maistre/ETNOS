<script lang="ts">
  // The entries a post is about (Percakapan, docs/plan/one-page-system-2026-11-21.md §4). Chosen entries are pills;
  // the Tentang button opens a search over the Ensiklopedia; names found in the text are offered as dashed pills
  // with their kind, so a name that two entries share (Puncak Jaya the regency and the mountain) shows both. Nothing
  // is added unless the author taps it. The same matcher runs on the server for the prompt after posting.
  import { Plus, X } from '@lucide/svelte'
  import { MAX_TENTANG, searchNames, suggestions, type NameEntry, type NameIndex } from './tentang-match.ts'
  import { loadNames, type Tag } from './tentang.svelte.ts'

  let { value = $bindable([]), text = '', disabled = false }: { value?: Tag[]; text?: string; disabled?: boolean } = $props()
  const uid = $props.id()
  let list = $state<NameEntry[]>([]), index = $state<NameIndex | null>(null), problem = $state('')
  let open = $state(false), query = $state(''), dismissed = $state<string[]>([])
  let field = $state<HTMLInputElement | null>(null)
  $effect(() => {
    let live = true
    loadNames().then((n) => { if (live) { list = n.list; index = n.index } }).catch(() => { if (live) problem = 'Daftar entri belum dapat dimuat.' })
    return () => { live = false }
  })
  const chosen = $derived(new Set(value.map((t) => t.slug)))
  const full = $derived(value.length >= MAX_TENTANG)
  const matches = $derived(open ? searchNames(query, list).filter((e) => !chosen.has(e.slug)) : [])
  const offered = $derived(index && !full ? suggestions(text, index, [...chosen, ...dismissed], 3).flatMap((m) => m.entries) : [])
  function add(e: { slug: string; title: string; label: string }) {
    if (chosen.has(e.slug) || full) return
    value = [...value, { slug: e.slug, title: e.title, label: e.label }]
    query = ''
    if (value.length >= MAX_TENTANG) open = false
    else field?.focus()
  }
  const remove = (slug: string) => { value = value.filter((t) => t.slug !== slug) }
  function toggle() {
    open = !open
    if (open) queueMicrotask(() => field?.focus())
  }
</script>

<div class="tp" role="group" aria-label="Tentang apa posting ini">
  <div class="tp-row">
    {#each value as t (t.slug)}<span class="tp-chip">
        <span>{t.title}</span>
        <button type="button" {disabled} aria-label={'Lepas ' + t.title} onclick={() => remove(t.slug)}><X size={14} /></button>
      </span>{/each}
    {#if !full}<button type="button" class="tp-add" {disabled} aria-expanded={open} aria-controls={uid + '-search'} onclick={toggle}><Plus size={15} aria-hidden="true" />Tentang</button>
    {:else}<span class="tp-full">Paling banyak {MAX_TENTANG} entri</span>{/if}
  </div>
  {#if open && !full}<div class="tp-search" id={uid + '-search'}>
      <label class="sr-only" for={uid + '-q'}>Cari entri</label>
      <input id={uid + '-q'} bind:this={field} type="search" bind:value={query} placeholder="Cari tempat, bahasa, suku…" autocomplete="off" {disabled}
        onkeydown={(e) => { if (e.key === 'Escape') { e.preventDefault(); open = false } else if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0]) } }} />
      {#if matches.length}<ul class="tp-matches">
          {#each matches as e (e.slug)}<li><button type="button" {disabled} onclick={() => add(e)}><span>{e.title}</span><small>{e.label}</small></button></li>{/each}
        </ul>{:else if query.trim().length >= 2 && list.length}<p class="tp-hint">Belum ada entri dengan nama itu.</p>{/if}
      {#if problem}<p class="tp-hint" role="alert">{problem}</p>{/if}
    </div>{/if}
  {#if offered.length}<div class="tp-offer">
      <span class="tp-offer-lead">Disebut di tulisan</span>
      {#each offered as e (e.slug)}<button type="button" class="tp-suggest" {disabled} aria-label={'Tandai ' + e.title + ', ' + e.label} onclick={() => add(e)}><Plus size={14} aria-hidden="true" />{e.title}<small>{e.label}</small></button>{/each}
      <button type="button" class="tp-skip" {disabled} onclick={() => (dismissed = [...dismissed, ...offered.map((e) => e.slug)])}>Abaikan</button>
    </div>{/if}
</div>

<style>
  .tp { display: grid; gap: 8px; margin-top: 10px; }
  .tp-row, .tp-offer { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .tp-chip { display: inline-flex; align-items: center; gap: 2px; min-height: 34px; padding: 0 3px 0 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13.5px; font-weight: 550; }
  .tp-chip button { display: inline-grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 999px; background: none; color: var(--muted-foreground); cursor: pointer; }
  .tp-chip button:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); color: var(--foreground); }
  .tp-add, .tp-suggest, .tp-skip { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 0 12px; border-radius: 999px; background: none; color: inherit; font: inherit; font-size: 13.5px; font-weight: 550; cursor: pointer; }
  .tp-add { border: 1px solid var(--border); color: var(--muted-foreground); }
  .tp-add:hover, .tp-add[aria-expanded='true'] { color: var(--foreground); background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .tp-suggest { border: 1px dashed color-mix(in oklab, var(--foreground) 32%, transparent); }
  .tp-suggest small { margin-left: 2px; color: var(--muted-foreground); font-size: 12.5px; font-weight: 400; }
  .tp-suggest:hover { border-style: solid; background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .tp-skip { border: 0; padding: 0 8px; color: var(--muted-foreground); font-weight: 400; }
  .tp-skip:hover { color: var(--foreground); }
  .tp-offer-lead, .tp-full, .tp-hint { color: var(--muted-foreground); font-size: 13px; }
  .tp-offer-lead { margin-right: 2px; }
  .tp-hint { margin: 0; }
  .tp-search { display: grid; gap: 6px; }
  .tp-search input { min-height: 44px; padding: 0 12px; border: 1px solid var(--input); border-radius: 12px; background: var(--card); color: inherit; font: inherit; font-size: 16px; }
  .tp-search input:focus-visible { outline: 2px solid var(--brand); outline-offset: 1px; }
  .tp-matches { margin: 0; padding: 0; list-style: none; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .tp-matches li + li { border-top: 1px solid var(--border); }
  .tp-matches button { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 0 12px; background: none; border: 0; color: inherit; font: inherit; font-size: 14.5px; text-align: left; cursor: pointer; }
  .tp-matches button:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .tp-matches small { color: var(--muted-foreground); font-size: 13px; }
  .tp button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .tp button:disabled { opacity: 0.55; cursor: default; }
</style>
