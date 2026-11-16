<script lang="ts">
  // Contents of the open wiki page, for the side rail. Marks the section in view.
  import { markdown } from './markdown'
  let { text, pageId }: { text: string; pageId: string } = $props()
  const headings = $derived.by(() => {
    const template = document.createElement('template')
    template.innerHTML = markdown(text, [], 'wiki-' + pageId)
    return Array.from(template.content.querySelectorAll('h1,h2,h3')).map((h) => ({ id: h.id, text: h.textContent ?? '', level: Number(h.tagName[1]) }))
  })
  let current = $state('')
  $effect(() => {
    const ids = headings.map((h) => h.id)
    if (!ids.length) return
    const seen = new Map<string, boolean>()
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting)
      current = ids.find((id) => seen.get(id)) ?? current
    }, { rootMargin: '0px 0px -70% 0px' })
    const frame = requestAnimationFrame(() => ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el) }))
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  })
</script>

{#if headings.length}<nav class="wiki-rail-contents" aria-label="Isi halaman">
    <h2>Isi halaman</h2>
    <ol>
      {#each headings as h}<li class:sub={h.level > 2}><a href={'#' + h.id} aria-current={current === h.id ? 'location' : undefined}>{h.text}</a></li>{/each}
    </ol>
  </nav>{/if}

<style>
  .wiki-rail-contents { display: grid; gap: 8px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  li.sub { padding-left: 12px; }
  a { display: block; padding: 3px 0 3px 10px; border-left: 2px solid transparent; color: var(--muted-foreground); font-size: 14px; line-height: 1.35; text-decoration: none; }
  a:hover { color: var(--foreground); }
  a[aria-current='location'] { color: var(--foreground); border-color: var(--foreground); }
</style>
