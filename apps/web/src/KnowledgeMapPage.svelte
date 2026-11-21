<script lang="ts">
  // The knowledge map on its own full-screen page, `/wiki/peta?lens=…&focus=…`. The address keeps the lens and the
  // selected thing, so a link opens the same view. Esc or the back button closes it and returns to the page before.
  import { onMount } from 'svelte'
  import { X } from '@lucide/svelte'
  import KnowledgeExplorer, { DEFAULT_LENS } from './KnowledgeExplorer.svelte'
  import EntityPanel, { type KComention, type KEdge, type KNode } from './EntityPanel.svelte'
  import { isLens, type Lens } from './stage-layouts.ts'
  import { loadViewerObjects, type ViewerObject } from './viewer-data.ts'
  import { MAP_NAME, OBSERVATORY_NAME } from './observatory-name.ts'
  import './styles/observatorium.css'

  type Graph = { counts: { entities: number; excerpts: number }; nodes: (KNode & { cluster?: number; x?: number; y?: number })[]; statements: KEdge[]; comentions: KComention[]; gaps: { coverage: { region: string; title: string }[] } }
  let graph = $state<Graph | null>(null),
    failed = $state(false),
    lens = $state<Lens>(DEFAULT_LENS),
    selected = $state(''),
    objects = $state<ViewerObject[]>([]),
    home = $state<HTMLAnchorElement>()

  const byId = $derived(new Map((graph?.nodes ?? []).map((n) => [n.id, n])))
  const regionTitles = $derived(new Map((graph?.gaps.coverage ?? []).map((c) => [c.region, c.title])))

  onMount(() => {
    const q = new URLSearchParams(location.search), asked = q.get('lens')
    if (isLens(asked)) lens = asked
    selected = q.get('focus') ?? ''
    const abort = new AbortController()
    fetch('/observatory/knowledge/graph.json', { signal: abort.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((g: Graph) => { graph = g; if (selected && !g.nodes.some((n) => n.id === selected)) selected = '' })
      .catch(() => { if (!abort.signal.aborted) failed = true })
    void loadViewerObjects().then((o) => (objects = o))
    const root = document.documentElement, before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => { abort.abort(); root.style.overflow = before }
  })
  // The address follows the lens and the selection without adding history entries.
  $effect(() => {
    const l = lens, f = selected
    try {
      const url = new URL(location.href)
      if (l === DEFAULT_LENS) url.searchParams.delete('lens')
      else url.searchParams.set('lens', l)
      if (f) url.searchParams.set('focus', f)
      else url.searchParams.delete('focus')
      if (url.href !== location.href) history.replaceState(history.state, '', url)
    } catch { /* The address is a convenience. */ }
  })
  function close() {
    if (history.state?.etnosDepth > 0) history.back()
    else home?.click()
  }
  function keydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || e.defaultPrevented || selected) return
    if (e.target instanceof Element && e.target.closest('input,textarea,[role="dialog"]')) return
    e.preventDefault()
    close()
  }
  // Full screen sits on the body, above the app shell, as the wiki map did before (KnowledgeMap.svelte).
  function portal(node: HTMLElement) { document.body.appendChild(node); return { destroy() { node.remove() } } }
</script>

<svelte:window onkeydown={keydown} />

<div class="kmp obs" use:portal role="dialog" aria-modal="true" aria-labelledby="kmp-title">
  <header class="kmp-bar">
    <button type="button" class="kmp-close" onclick={close} aria-label="Tutup layar penuh"><X size={18} aria-hidden="true" /><span>Tutup</span></button>
    <h1 id="kmp-title">{MAP_NAME}</h1>
    <a class="kmp-home" href="/wiki" bind:this={home}>{OBSERVATORY_NAME}</a>
  </header>
  <div class="kmp-body">
    {#if graph}<KnowledgeExplorer {graph} mode="full" bind:lens bind:selected />
    {:else if failed}<p class="obs-note">Peta pengetahuan belum dapat dimuat. Coba muat ulang halaman ini.</p>
    {:else}<div class="obs-skeleton kmp-skeleton" aria-hidden="true"></div><p class="sr-only" role="status">Memuat peta pengetahuan</p>{/if}
  </div>
</div>
{#if graph}<EntityPanel bind:id={selected} nodes={byId} statements={graph.statements} comentions={graph.comentions ?? []} regionTitle={(r) => regionTitles.get(r) ?? r} {objects} />{/if}

<style>
  .kmp { position: fixed; inset: 0; z-index: 45; display: flex; flex-direction: column; background: var(--background); color: var(--foreground); }
  .kmp-bar { display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 8px var(--gutter); border-bottom: 1px solid var(--border); padding-top: max(8px, env(safe-area-inset-top)); }
  .kmp-bar h1 { flex: 1; min-width: 0; font-size: 20px !important; }
  .kmp-close { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px 0 10px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--foreground); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .kmp-close:hover { background: var(--row-hover); }
  .kmp-home { font-size: 13.5px; color: var(--muted-foreground); text-decoration: none; }
  .kmp-home:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .kmp-body { flex: 1; min-height: 0; padding: 14px var(--gutter) max(14px, env(safe-area-inset-bottom)); overflow-y: auto; }
  .kmp-skeleton { height: 100%; }
  @media (max-width: 640px) { .kmp-home { display: none; } .kmp-bar h1 { font-size: 18px !important; } }
</style>
