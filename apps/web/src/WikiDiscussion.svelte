<script lang="ts">
  // Posts that link to this wiki page, and actions to copy the link or start a post about it.
  import { SvelteURLSearchParams } from 'svelte/reactivity'
  import { MessageCircle, Link2 } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import PostCard from './PostCard.svelte'
  import { request, type Post, type Auth, type Community, type Membership } from './api'
  import { notify } from './notifications.svelte'
  let { pageId, citations, auth, communities, memberships, onShare }: { pageId: string; citations: string[]; auth: Auth; communities: Community[]; memberships: Membership[]; onShare: (url: string) => void } = $props()
  let posts = $state<Post[]>([]), loaded = $state(false)
  const url = $derived(location.origin + '/wiki/' + pageId)
  $effect(() => {
    const links = [location.origin + '/wiki/' + pageId], controller = new AbortController()
    loaded = false
    request<{ items: Post[] }>('/v1/feed/page?' + new SvelteURLSearchParams({ roots: 'true', links: JSON.stringify(links) }), undefined, controller.signal)
      .then((page) => { if (!controller.signal.aborted) { posts = page.items; loaded = true } })
      .catch(() => { if (!controller.signal.aborted) loaded = true })
    return () => controller.abort()
  })
  async function copy() {
    try { await navigator.clipboard.writeText(url); notify('Tautan halaman disalin.') } catch { notify('Tautan belum dapat disalin.') }
  }
</script>

<section class="wiki-discussion" aria-label="Percakapan tentang halaman ini">
  <div class="wiki-discussion-head">
    <h2>Dibicarakan</h2>
    <div>
      <Button variant="ghost" onclick={copy} aria-label="Salin tautan halaman"><Link2 size={16} /></Button>
      <Button variant="outline" onclick={() => onShare(url)}><MessageCircle size={16} />Bahas di komunitas</Button>
    </div>
  </div>
  {#each posts as post (post.id)}<PostCard {post} community={communities.find((c) => c.id === post.community_id)} loggedIn={!!auth.actor} canVote={memberships.some((m) => m.community_id === post.community_id)} onError={notify} />{/each}
  {#if loaded && !posts.length}<p class="wiki-discussion-empty">Belum ada posting yang membahas halaman ini.</p>{/if}
</section>

<style>
  .wiki-discussion { display: grid; gap: 12px; padding: 24px 0 8px; border-top: 1px solid var(--border); }
  .wiki-discussion-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
  .wiki-discussion-head div { display: flex; gap: 6px; }
  h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .wiki-discussion-empty { margin: 0; color: var(--muted-foreground); font-size: 14px; }
</style>
