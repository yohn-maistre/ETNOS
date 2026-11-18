<script lang="ts">
  // Wiki home sections built from the same public data as Peta wiki: places first, with the mountains,
  // lakes, forests and species of each region before its peoples and languages,
  // then a few pages per domain, rotated by day and narrowed by the chosen place.
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import LandscapePrint from './LandscapePrint.svelte'
  import { siteBranding } from './site-branding'
  import { loadMap, domainGroups, highlandRegions, type MapData, type MapNode } from './observatory'
  import { placeScope } from './place-scope.svelte'
  import { scopeRegions } from './scope-region.svelte'
  import { clip } from './api'
  const scoped = scopeRegions()

  let data = $state<MapData | null>(null)
  onMount(() => { void loadMap().then((d) => (data = d)) })

  const art = (reg: string) => siteBranding.welcomeArtworks.find((a) => a.id === (highlandRegions.has(reg) ? 'tigi' : 'raja-ampat')) ?? null
  const pages = $derived(data ? data.nodes.filter((n): n is MapNode & { href: string } => n.k === 'page' && !!n.href) : [])
  const regions = $derived.by(() => {
    if (!data) return []
    return data.nodes
      .filter((n) => n.k === 'region')
      .filter((r) => scoped.has(r.reg))
      .map((r) => {
        const own = pages.filter((p) => p.reg === r.reg)
        const home = own.find((p) => p.kind === 'region')
        return {
          reg: r.reg,
          title: home?.t ?? r.t,
          href: home?.href,
          beings: own.filter((p) => p.kind === 'being'),
          peoples: own.filter((p) => p.kind === 'people'),
          languages: own.filter((p) => p.kind === 'language'),
          places: own.filter((p) => p.kind === 'regency').length,
        }
      })
  })
  const groupsShown = $derived(domainGroups.filter((g) => pages.some((p) => p.d?.some((t) => g.tags.includes(t)))))
  let group = $state(domainGroups[0].key)
  const day = Math.floor(Date.now() / 86400000)
  const picks = $derived.by(() => {
    const g = domainGroups.find((x) => x.key === group)!
    const pool = pages.filter((p) => scoped.has(p.reg) && p.d?.some((t) => g.tags.includes(t)))
    if (!pool.length) return []
    const start = day % pool.length
    return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 4)
  })
  function snippet(t: string | undefined) { return clip(t, 140) }
</script>

{#if regions.length}
  <section class="wp" aria-labelledby="wp-places">
    <h2 id="wp-places">Tempat dan suku</h2>
    <div class="wp-regions">
      {#each regions as r (r.reg)}{@const a = art(r.reg)}
        <article class="wp-region">
          <div class="wp-cover" aria-hidden="true">{#if a}<LandscapePrint artwork={a} decorative />{/if}</div>
          <div class="wp-body">
            {#if r.href}<a class="wp-title" href={r.href}>{r.title}</a>{:else}<span class="wp-title">{r.title}</span>{/if}
            <p class="wp-count">{r.places} halaman kabupaten</p>
            {#if r.beings.length}<p class="wp-list"><span>Alam</span>{#each r.beings as p, i}<a href={p.href}>{p.t}</a>{i < r.beings.length - 1 ? ', ' : ''}{/each}</p>{/if}
            {#if r.peoples.length}<p class="wp-list"><span>Suku</span>{#each r.peoples as p, i}<a href={p.href}>{p.t.replace(/^Suku /, '')}</a>{i < r.peoples.length - 1 ? ', ' : ''}{/each}</p>{/if}
            {#if r.languages.length}<p class="wp-list"><span>Bahasa</span>{#each r.languages as p, i}<a href={p.href}>{p.t.replace(/^Bahasa /, '')}</a>{i < r.languages.length - 1 ? ', ' : ''}{/each}</p>{/if}
          </div>
        </article>
      {/each}
    </div>
  </section>
{/if}

{#if pages.length}
  <section class="wp" aria-labelledby="wp-domains">
    <h2 id="wp-domains">Menurut ranah</h2>
    <div class="wp-tabs" role="tablist" aria-label="Pilih ranah">
      {#each groupsShown as g (g.key)}<button role="tab" aria-selected={group === g.key} onclick={() => (group = g.key)}>{g.label}</button>{/each}
    </div>
    {#if picks.length}
      <ul class="wp-picks">
        {#each picks as p (p.href)}<li><a href={p.href}><strong>{p.t}</strong><span>{snippet(p.x)}</span><ArrowUpRight size={16} /></a></li>{/each}
      </ul>
    {:else}
      <p class="wp-empty">Belum ada halaman untuk ranah ini di {placeScope.title}.</p>
    {/if}
  </section>
{/if}

<style>
  .wp { display: grid; gap: 14px; padding: 20px 24px 24px; border-top: 1px solid var(--commons-hairline, var(--border)); }
  h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .wp-regions { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .wp-region { display: grid; grid-template-rows: 96px auto; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--card); }
  .wp-cover { position: relative; overflow: hidden; background: var(--muted); }
  .wp-cover :global(.landscape-print) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 68%; }
  .wp-body { display: grid; align-content: start; gap: 6px; padding: 12px 14px 14px; min-width: 0; }
  .wp-title { font-family: var(--font-editorial, inherit); font-size: 22px; line-height: 1.15; color: var(--foreground); text-decoration: none; }
  a.wp-title:hover { text-decoration: underline; text-underline-offset: 4px; }
  .wp-count { margin: 0; font-size: 13px; color: var(--muted-foreground); }
  .wp-list { margin: 0; font-size: 14px; line-height: 1.5; }
  .wp-list span { color: var(--muted-foreground); margin-right: 6px; }
  .wp-list a { color: var(--foreground); text-underline-offset: 3px; }
  .wp-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .wp-tabs button { all: unset; cursor: pointer; padding: 6px 12px; min-height: 24px; border: 1px solid var(--border); border-radius: 999px; font-size: 14px; color: var(--muted-foreground); }
  .wp-tabs button[aria-selected='true'] { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  .wp-tabs button:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; }
  .wp-picks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
  .wp-picks a { position: relative; display: grid; gap: 4px; height: 100%; box-sizing: border-box; padding: 12px 34px 12px 14px; border: 1px solid var(--border); border-radius: 12px; color: var(--foreground); text-decoration: none; }
  .wp-picks a:hover { border-color: var(--foreground); }
  .wp-picks strong { font-family: var(--font-editorial, inherit); font-weight: 400; font-size: 18px; line-height: 1.2; }
  .wp-picks span { font-size: 13px; line-height: 1.45; color: var(--muted-foreground); }
  .wp-picks :global(svg) { position: absolute; top: 12px; right: 12px; color: var(--muted-foreground); }
  .wp-empty { margin: 0; font-size: 14px; color: var(--muted-foreground); }
  @media (max-width: 640px) { .wp { padding: 16px 16px 20px; } }
</style>
