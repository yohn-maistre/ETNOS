<script lang="ts">
  import { request } from './api'

  type Work = { title: string; year: number | null; authors: string[]; moreAuthors: number; venue: string; url: string; open: boolean; cited: number }
  type Result = { available: boolean; query: string; more: string; total: number; items: Work[] }

  let { slug }: { slug: string } = $props()
  let result = $state<Result | null>(null)

  // Labels without a search, a missing key and an unreachable index all leave this section out.
  $effect(() => {
    const abort = new AbortController()
    result = null
    request<Result>('/v1/literature/' + slug, undefined, abort.signal, true)
      .then((r) => (result = r))
      .catch(() => {})
    return () => abort.abort()
  })
  const byline = (w: Work) =>
    [w.authors.join(', ') + (w.moreAuthors ? ' dkk.' : ''), w.year, w.venue].filter(Boolean).join(' · ')
</script>

{#if result?.available && result.items.length}
  <section id="context-literature" class="literature" aria-labelledby="literature-heading">
    <h2 id="literature-heading">Riset terbit</h2>
    <p class="lit-note">
      {result.total.toLocaleString('id-ID')} karya di OpenAlex cocok dengan pencarian <code>{result.query}</code>. Ini hasil
      pencarian, belum ditinjau siapa pun di sini.
    </p>
    <ol>
      {#each result.items as w (w.url)}
        <li>
          <a href={w.url} target="_blank" rel="noreferrer">{w.title}</a>
          <span class="lit-by">{byline(w)}</span>
          <span class="lit-meta">
            {#if w.open}<span>Akses terbuka</span>{/if}
            {#if w.cited}<span>Dikutip {w.cited.toLocaleString('id-ID')} kali</span>{/if}
          </span>
        </li>
      {/each}
    </ol>
    <p class="lit-more"><a href={result.more} target="_blank" rel="noreferrer">Lihat semua di OpenAlex</a></p>
  </section>
{/if}

<style>
  .literature { display: grid; gap: 10px; padding: 20px 24px; border-top: 1px solid var(--reading-line); }
  h2 { margin: 0; font-size: 17px; font-weight: 600; }
  p { margin: 0; }
  .lit-note { font-size: 13px; line-height: 1.55; color: var(--muted-foreground); }
  code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; overflow-wrap: anywhere; }
  ol { display: grid; gap: 14px; margin: 4px 0 0; padding: 0; list-style: none; }
  li { display: grid; gap: 2px; }
  li > a { font-size: 15px; line-height: 1.4; font-weight: 500; color: var(--foreground); text-decoration: none; overflow-wrap: anywhere; }
  li > a:hover, li > a:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
  .lit-by { font-size: 13px; line-height: 1.5; color: var(--muted-foreground); }
  .lit-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: var(--muted-foreground); }
  .lit-more { font-size: 13px; }
  .lit-more a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
  @media (max-width: 640px) {
    .literature { padding-inline: 16px; }
  }
</style>
