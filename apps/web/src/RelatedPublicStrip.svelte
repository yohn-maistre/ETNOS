<script lang="ts">
  import { ArrowUpRight, Hash, Sparkles } from '@lucide/svelte'
  import { request, type Post } from './api'

  type ClassifiedTopic = { slug: string; title: string; score: number }
  type RelatedHit = {
    post: Post
    communityTitle: string
    score: number
    topics: ClassifiedTopic[]
    sameCommunity?: boolean
  }
  type RelatedResponse = {
    postId: string
    mode: 'bge-m3' | 'deterministic'
    topics: ClassifiedTopic[]
    related: RelatedHit[]
  }

  let { postId }: { postId: string } = $props()
  let data = $state<RelatedResponse | null>(null)

  $effect(() => {
    const id = postId
    data = null
    const abort = new AbortController()
    request<RelatedResponse>(`/v1/posts/${encodeURIComponent(id)}/related-public?limit=4`, undefined, abort.signal, true)
      .then((res) => {
        if (!abort.signal.aborted) data = res
      })
      .catch(() => {})
    return () => abort.abort()
  })

  const snippet = (p: Post) => {
    const raw = (p.content?.title || p.text || '').replace(/\s+/g, ' ').trim()
    return raw.length > 110 ? raw.slice(0, 107) + '...' : raw
  }
</script>

{#if data && (data.topics.length || data.related.length)}
  <section class="rp-wrap" aria-label="Topik dan percakapan serupa lintas komunitas">
    {#if data.topics.length}
      <div class="rp-topics">
        <span class="rp-label">
          <Sparkles size={13} aria-hidden="true" />
          <span>Topik terkait</span>
        </span>
        <div class="rp-chips">
          {#each data.topics as t (t.slug)}
            <a class="rp-chip" href={`/wiki/${t.slug}`}>
              <Hash size={12} aria-hidden="true" />
              <span>{t.title}</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    {#if data.related.length}
      <div class="rp-related">
        <div class="rp-head">
          <h3>Percakapan serupa di komunitas lain</h3>
          <small>{data.mode === 'bge-m3' ? 'Pencarian semantik' : 'Kemiripan teks'}</small>
        </div>
        <ul class="rp-list">
          {#each data.related as item (item.post.id)}
            <li>
              <a class="rp-card" href={`/square/${item.post.id}`}>
                <span class="rp-card-body">
                  <span class="rp-card-meta">
                    <span class="rp-comm" class:cross={!item.sameCommunity}>{item.communityTitle}</span>
                    <span>· {item.post.author.name}</span>
                  </span>
                  <strong>{snippet(item.post)}</strong>
                </span>
                <ArrowUpRight size={15} class="rp-go" aria-hidden="true" />
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </section>
{/if}

<style>
  .rp-wrap {
    display: grid;
    gap: 14px;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  .rp-topics {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .rp-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12.5px;
    font-weight: 650;
    color: var(--muted-foreground);
  }
  .rp-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .rp-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--foreground);
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .rp-chip:hover {
    background: color-mix(in oklab, var(--foreground) 5%, transparent);
  }
  .rp-related {
    display: grid;
    gap: 8px;
  }
  .rp-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .rp-head h3 {
    margin: 0;
    font-size: 14.5px;
    font-weight: 750;
  }
  .rp-head small {
    font-size: 12px;
    color: var(--muted-foreground);
  }
  .rp-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .rp-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: var(--card);
    color: var(--foreground);
    text-decoration: none;
  }
  .rp-card:hover {
    background: color-mix(in oklab, var(--foreground) 4%, var(--card));
  }
  .rp-card-body {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .rp-card-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--muted-foreground);
  }
  .rp-comm {
    font-weight: 650;
    color: var(--foreground);
  }
  .rp-comm.cross {
    color: var(--brand, #0f766e);
  }
  .rp-card-body strong {
    font-size: 13.5px;
    font-weight: 600;
    line-height: 1.35;
  }
  .rp-card :global(.rp-go) {
    flex: none;
    color: var(--muted-foreground);
  }
</style>
