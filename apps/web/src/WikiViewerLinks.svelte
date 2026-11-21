<script lang="ts">
  // Under a wiki article: the viewer records whose name the article mentions, so a reader can open a mountain, a lake
  // or a species named in the text full screen. Matching is by the record's whole name in the article text.
  import { onMount } from 'svelte'
  import { KIND_LABEL, loadViewerObjects, viewerHref, type ViewerObject } from './viewer-data.ts'
  import { VIEWER_NAME } from './observatory-name.ts'

  let { text }: { text: string } = $props()
  let objects = $state<ViewerObject[]>([])
  onMount(() => { void loadViewerObjects().then((all) => (objects = all)) })
  const named = $derived.by(() => {
    const t = text.toLowerCase()
    return objects.filter((o) => o.kind !== 'dataset' && t.includes(o.title.toLowerCase()))
  })
</script>

{#if named.length}<section class="wvl" aria-labelledby="wvl-title">
    <h2 id="wvl-title">Disebut di halaman ini, buka di {VIEWER_NAME}</h2>
    <ul>
      {#each named as o (o.id)}<li><a href={viewerHref(o.id)}>
            {#if o.thumb}<img src={o.thumb} alt="" width="44" height="44" loading="lazy" />{/if}
            <span><strong>{o.title}</strong><small>{KIND_LABEL[o.kind]}</small></span>
          </a></li>{/each}
    </ul>
  </section>{/if}

<style>
  .wvl { display: grid; gap: 10px; padding: 20px 28px 24px; border-top: 1px solid var(--border); }
  @media (max-width: 767px) { .wvl { padding-inline: 20px; } }
  .wvl h2 { margin: 0; font-size: 14px; font-weight: 650; color: var(--muted-foreground); }
  .wvl ul { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
  .wvl a { display: inline-flex; align-items: center; gap: 10px; min-height: 48px; padding: 4px 14px 4px 4px; border: 1px solid var(--border); border-radius: 12px; color: var(--foreground); text-decoration: none; }
  .wvl a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .wvl a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .wvl img { width: 40px; height: 40px; border-radius: 9px; object-fit: cover; background: var(--secondary); }
  .wvl a:not(:has(img)) { padding-left: 14px; }
  .wvl span { display: grid; line-height: 1.25; }
  .wvl strong { font-size: 14.5px; font-weight: 600; }
  .wvl small { font-size: 12.5px; color: var(--muted-foreground); }
</style>
