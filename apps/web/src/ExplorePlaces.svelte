<script lang="ts">
  // Jelajah's place section: the seven customary regions first, with what the wiki already holds for each,
  // then plain links into provinces, regencies and languages, then subject topics.
  import { onMount } from 'svelte'
  import { ArrowUpRight, Hash } from '@lucide/svelte'
  import { loadMap, type MapData } from './observatory'
  import { request } from './api'
  type Ctx = { id: string; slug: string; title: string; kind: string; facet: string; description: string }
  let map = $state<MapData | null>(null),
    contexts = $state<Ctx[]>([])
  onMount(() => {
    const abort = new AbortController()
    void loadMap().then((d) => (map = d))
    request<Ctx[]>('/v1/contexts', undefined, abort.signal, true)
      .then((all) => (contexts = all))
      .catch(() => {})
    return () => abort.abort()
  })
  const pages = $derived(map?.nodes.filter((n) => n.k === 'page' && n.href) ?? [])
  const regions = $derived(
    contexts
      .filter((c) => c.facet === 'customary-region')
      .map((c) => {
        const own = pages.filter((p) => p.reg === c.slug)
        const home = own.find((p) => p.kind === 'region' && p.t.startsWith('Wilayah adat')) ?? own.find((p) => p.kind === 'region')
        return {
          slug: c.slug,
          title: c.title.replace(/^Meepago$/, 'Mee Pago'),
          href: home?.href ?? '/contexts/' + c.slug,
          pages: own.length,
          peoples: own.filter((p) => p.kind === 'people').map((p) => p.t.replace(/^Suku /, '')),
          regencies: own.filter((p) => p.kind === 'regency').length,
        }
      })
      .sort((a, b) => b.pages - a.pages || a.title.localeCompare(b.title, 'id')),
  )
  const count = (kind: string, facet: string | null = null) => contexts.filter((c) => c.kind === kind && (facet === null || c.facet === facet)).length
  const topics = $derived(contexts.filter((c) => c.kind === 'topic' && !c.facet))
</script>

{#if regions.length}<section class="discovery-section explore-places" aria-labelledby="explore-places-title">
    <div class="discovery-section-head">
      <h2 id="explore-places-title">Tanah Papua</h2>
      <a href="/contexts">Peta <ArrowUpRight size={14} /></a>
    </div>
    <ul class="explore-regions">
      {#each regions as r (r.slug)}<li>
          <a class="explore-region" class:empty={!r.pages} href={r.href}>
            <strong>{r.title}</strong>
            {#if r.pages}<span>{r.pages} halaman{r.regencies ? ' · ' + r.regencies + ' kabupaten' : ''}</span>
              {#if r.peoples.length}<small>{r.peoples.join(', ')}</small>{/if}
            {:else}<span>Belum ada halaman</span>{/if}
          </a>
        </li>{/each}
    </ul>
    <p class="explore-place-links">
      <a href="/contexts">{count('region', 'province')} provinsi</a>
      <a href="/contexts">{count('place')} kabupaten dan kota</a>
      <a href="/contexts">{count('language')} bahasa</a>
    </p>
  </section>{/if}
{#if topics.length}<section class="discovery-section" aria-labelledby="explore-topics-title">
    <div class="discovery-section-head">
      <h2 id="explore-topics-title">Topik</h2>
      <a href="/topics">Semua <ArrowUpRight size={14} /></a>
    </div>
    <ul class="explore-topics">
      {#each topics as t (t.id)}<li><a href={'/contexts/' + t.slug}><Hash size={13} aria-hidden="true" />{t.title}</a></li>{/each}
    </ul>
  </section>{/if}
