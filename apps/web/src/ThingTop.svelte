<script lang="ts">
  // The block at the top of a thing page, in the same form the thing has on Jelajah: a place shows where it sits
  // in the strata of customary regions, a language its Glottolog facts and the languages around the same reference
  // point, a topic its branches (or the topics it belongs to). When the context list cannot load, the plain list
  // the page passes in shows instead.
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { ArrowUpRight } from '@lucide/svelte'
  import PlaceStrata from './PlaceStrata.svelte'
  import LanguageSpecimen, { type SpecimenGroup } from './LanguageSpecimen.svelte'
  import TopicTiles from './TopicTiles.svelte'
  import { loadMap, type MapData } from './observatory'
  import { buildStrata, loadAtlasLangs, loadContexts, regionsOf, regionTitle, topicNeighbourhood, type AtlasLang, type Ctx } from './explore-data'

  let {
    thing,
    fallback,
  }: {
    thing: { id: string; slug: string; title: string; kind: string; facet?: string; description?: string; aliases?: string[] }
    fallback?: Snippet
  } = $props()

  let contexts = $state<Ctx[]>([]),
    langs = $state<AtlasLang[]>([]),
    map = $state<MapData | null>(null),
    failed = $state(false)
  onMount(() => {
    loadContexts()
      .then((all) => (contexts = all))
      .catch(() => (failed = true))
    void loadAtlasLangs().then((l) => (langs = l))
    void loadMap().then((d) => (map = d))
  })

  const isPlace = $derived(thing.kind === 'place' || thing.kind === 'region')
  const regions = $derived(regionsOf(thing.slug, contexts, langs))
  const strata = $derived(isPlace && regions.length ? buildStrata(contexts, langs, map) : [])
  // On a province page its kabupaten are marked across the layers they fall in.
  const current = $derived.by(() => {
    if (thing.kind === 'place') return [thing.slug]
    if (thing.facet !== 'province') return []
    const self = contexts.find((c) => c.slug === thing.slug)
    return self ? contexts.filter((c) => c.kind === 'place' && c.parents?.includes(self.id)).map((c) => c.slug) : []
  })

  const region = $derived(thing.kind === 'language' ? contexts.find((c) => c.slug === regions[0]) : undefined)
  const group = $derived<SpecimenGroup | null>(
    region
      ? {
          slug: region.slug,
          title: regionTitle(region),
          languages: langs
            .filter((l) => l[3] === region.slug)
            .map((l) => contexts.find((c) => c.slug === l[0]))
            .filter((c): c is Ctx => !!c)
            .sort((a, b) => a.title.localeCompare(b.title, 'id'))
            .map((c) => ({ slug: c.slug, title: c.title })),
        }
      : null,
  )
  const family = $derived(thing.description?.match(/^Rumpun (.+?) menurut Glottolog/)?.[1] ?? '')
  const glottocode = $derived(thing.aliases?.find((a) => a.startsWith('glottocode:'))?.slice('glottocode:'.length) ?? '')

  const topics = $derived(thing.kind === 'topic' && contexts.length ? topicNeighbourhood(thing.slug, contexts) : null)
  const ready = $derived(
    (isPlace && strata.length > 0) || (thing.kind === 'language' && (!!glottocode || !!group)) || (!!topics && topics.tiles.length > 0),
  )
  const waiting = $derived(!failed && !contexts.length)
</script>

{#if ready}
  <section class="thing-top" data-kind={thing.kind} aria-label={isPlace ? 'Letak ' + thing.title : thing.kind === 'language' ? 'Tentang bahasa ' + thing.title : 'Cabang topik ' + thing.title}>
    {#if isPlace}
      <h2>Letak di antara wilayah adat</h2>
      <p class="top-note">Tujuh wilayah adat, disusun kira-kira dari utara (atas) ke selatan (bawah).</p>
      <PlaceStrata {strata} focus={regions} compact {current} />
    {:else if thing.kind === 'language'}
      <dl class="lang-facts">
        {#if family}<div><dt>Rumpun</dt><dd>{family}</dd></div>{/if}
        {#if region}<div><dt>Titik acuan</dt><dd><a href={'/wiki/' + region.slug}>{regionTitle(region)}</a></dd></div>{/if}
        {#if glottocode}<div><dt>Glottolog</dt><dd><a href={'https://glottolog.org/resource/languoid/id/' + glottocode} target="_blank" rel="noreferrer">{glottocode} <ArrowUpRight size={13} /></a></dd></div>{/if}
      </dl>
      {#if group && group.languages.length > 1}
        <h2>Bahasa lain dengan titik acuan di {group.title}</h2>
        <LanguageSpecimen groups={[group]} total={group.languages.length} current={thing.slug} open={group.languages.findIndex((l) => l.slug === thing.slug) >= 8} />
      {/if}
    {:else if topics}
      <h2>{topics.mode === 'branches' ? 'Cabang ' + thing.title : topics.mode === 'parents' ? 'Termasuk dalam' : 'Topik utama'}</h2>
      <TopicTiles tiles={topics.tiles} limit={topics.mode === 'branches' ? 6 : 99} current={thing.slug} dense={topics.tiles.every((t) => !t.children.length)} />
    {/if}
  </section>
{:else if !waiting}
  {@render fallback?.()}
{/if}

<style>
  .thing-top { padding: 18px 0 6px; border-bottom: 1px solid var(--reading-line, var(--border)); }
  .thing-top h2 { margin: 0 24px 10px; font-size: 13px; font-weight: 600; color: var(--muted-foreground); }
  .thing-top[data-kind='place'] :global(.strata), .thing-top[data-kind='region'] :global(.strata) { margin-inline: 0; }
  .top-note { margin: -4px 24px 12px; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  .lang-facts { display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 0 24px 20px; }
  .lang-facts div { display: grid; gap: 2px; }
  .lang-facts dt { font-size: 12.5px; color: var(--muted-foreground); }
  .lang-facts dd { margin: 0; font-size: 15px; font-weight: 550; }
  .lang-facts a { display: inline-flex; align-items: center; gap: 3px; min-height: 40px; color: var(--foreground); text-underline-offset: 3px; }
  .lang-facts a:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; border-radius: 4px; }
  @media (max-width: 767px) {
    .thing-top h2 { margin-inline: 16px; }
    .lang-facts, .top-note { margin-inline: 16px; }
  }
</style>
