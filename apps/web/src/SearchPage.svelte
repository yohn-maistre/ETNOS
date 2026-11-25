<script lang="ts">
  import { Search, ArrowUpRight, Hash } from '@lucide/svelte'
  import ContentSkeleton from './ContentSkeleton.svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { request, type Post } from './api'
  import {
    categories,
    resultGroups,
    type SearchResult,
    type SearchCategory,
  } from './search'

  type SemanticHit = {
    post: Post
    communityTitle: string
    score: number
    topics: { slug: string; title: string; score: number }[]
  }
  type SemanticResponse = {
    mode: 'bge-m3' | 'deterministic'
    suggestedTopics: { slug: string; title: string; score: number }[]
    results: SemanticHit[]
  }

  let {
    query = '',
    onSearch,
  }: { query?: string; onSearch: (query: string) => void } = $props()
  let category = $state<SearchCategory>('all'),
    data = $state<SearchResult | null>(null),
    semantic = $state<SemanticResponse | null>(null),
    pending = $state(false),
    error = $state('')
  const groups = $derived(resultGroups(data, category))
  const extraSemantic = $derived.by(() => {
    if (!semantic || (category !== 'all' && category !== 'posts')) return []
    const exactIds = new Set((data?.posts ?? []).map((p) => p.id))
    return semantic.results.filter((r) => !exactIds.has(r.post.id))
  })
  const compact = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 140)

  $effect(() => {
    const controller = new AbortController()
    pending = true
    error = ''
    data = null
    semantic = null
    const q = query.trim()
    Promise.all([
      request<SearchResult>(
        '/v1/search?q=' + encodeURIComponent(query),
        undefined,
        controller.signal,
      ),
      q.length >= 3
        ? request<SemanticResponse>(
            '/v1/search/semantic?limit=10&q=' + encodeURIComponent(q),
            undefined,
            controller.signal,
            true,
          ).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([result, sem]) => {
        if (!controller.signal.aborted) {
          data = result
          semantic = sem
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) error = e.message
      })
      .finally(() => {
        if (!controller.signal.aborted) pending = false
      })
    return () => controller.abort()
  })
</script>

<div class="cx-page-head"><h1>Cari</h1></div>
<div class="search-query-summary">
  <span>{query ? `Hasil untuk “${query}”` : 'Di ETNOS'}</span>
  <Button variant="ghost" onclick={() => onSearch(query)}>
    <Search size={16} />Ubah pencarian
  </Button>
</div>
{#if semantic?.suggestedTopics.length}
  <div class="sp-topics" aria-label="Topik terkait pencarian">
    {#each semantic.suggestedTopics as t (t.slug)}
      <a class="sp-topic-pill" href={`/wiki/${t.slug}`}>
        <Hash size={13} aria-hidden="true" />
        <span>{t.title}</span>
      </a>
    {/each}
  </div>
{/if}
<div class="search-filters" role="group" aria-label="Jenis hasil">
  {#each categories as [key, label]}<button
      aria-pressed={category === key}
      onclick={() => (category = key)}
    >
      {label}
    </button>{/each}
</div>
{#if pending}<ContentSkeleton />{:else if error}<div
    class="search-state"
    role="alert"
  >
    {error}
  </div>{:else}
  {#each groups as group}<section class="search-page-group">
      <h2>{group.label}</h2>
      {#each group.items as item}<a class="search-page-result" href={item.href}>
          <span>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
          </span>
          <ArrowUpRight size={16} />
        </a>{/each}
    </section>{/each}
  {#if extraSemantic.length}<section class="search-page-group">
      <h2>Serupa lintas komunitas ({semantic?.mode === 'bge-m3' ? 'pencarian semantik' : 'topik terkait'})</h2>
      {#each extraSemantic as item (item.post.id)}<a class="search-page-result" href={`/square/${item.post.id}`}>
          <span>
            <strong>{item.post.content?.title || compact(item.post.text)}</strong>
            <small>{item.communityTitle} · {item.post.author.name}{item.topics.length ? ' · ' + item.topics.map((t) => '#' + t.title).join(' ') : ''}</small>
          </span>
          <ArrowUpRight size={16} />
        </a>{/each}
    </section>{/if}
  {#if !groups.length && !extraSemantic.length}<div class="search-state">
      <strong>Belum ada hasil</strong>
      <p>Coba nama, topik, atau kata lain.</p>
      <Button href="/explore" variant="outline">Jelajah</Button>
    </div>{/if}
{/if}

<style>
  .sp-topics {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 20px 10px;
  }
  .sp-topic-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 11px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--foreground);
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .sp-topic-pill:hover {
    background: color-mix(in oklab, var(--foreground) 5%, transparent);
  }
</style>
