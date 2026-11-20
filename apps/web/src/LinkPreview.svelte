<script lang="ts">
  import { ExternalLink } from '@lucide/svelte'
  import { localNewsPath, newsHeadline, newsStoryId } from './wiki-sources'
  let {
    url,
    title = '',
    enabled = true,
  }: { url: string; title?: string; enabled?: boolean } = $props()
  let preview = $state<{
    title: string
    description: string
    site: string
    image: string | null
  } | null>(null)
  const supported = new Set([
    'github.com',
    'en.wikipedia.org',
    'id.wikipedia.org',
    'www.antaranews.com',
    'suarapapua.com',
    'jubi.id',
    'westpapua.watch',
  ])
  // Upstream news-desk links open as ETNOS story pages, titled from our own copy of the story.
  const local = $derived(localNewsPath(url))
  $effect(() => {
    const target = url,
      abort = new AbortController()
    preview = null
    if (local) {
      const id = newsStoryId(target)
      if (id) void newsHeadline(id).then((h) => { if (!abort.signal.aborted && h) preview = { title: h.title, description: '', site: 'Kabar', image: null } })
      return () => abort.abort()
    }
    try {
      if (!enabled || !supported.has(new URL(target).hostname)) return
    } catch {
      return
    }
    const timer = setTimeout(
      () =>
        void fetch('/v1/link-preview?url=' + encodeURIComponent(target), {
          credentials: 'omit',
          signal: abort.signal,
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((p) => {
            if (!abort.signal.aborted) preview = p
          })
          .catch(() => {}),
      250,
    )
    return () => {
      clearTimeout(timer)
      abort.abort()
    }
  })
</script>

<a
  class="external-preview"
  href={local ?? url}
  target={local ? undefined : '_blank'}
  rel={local ? undefined : 'noopener noreferrer nofollow'}
  referrerpolicy="no-referrer"
  title={preview?.title || title || url}
>
  {#if preview?.image}<img
      src={preview.image}
      alt=""
      loading="lazy"
      onerror={(e) => e.currentTarget.setAttribute('hidden', '')}
    />{/if}
  <div>
    <small>{preview?.site ?? (local ? 'Kabar' : new URL(url).hostname)}</small>
    <strong>{preview?.title || title || url}</strong>
    {#if preview?.description}<p>{preview.description}</p>{/if}
  </div>
  {#if !local}<ExternalLink size={16} />{/if}
</a>
