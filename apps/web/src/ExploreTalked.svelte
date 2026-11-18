<script lang="ts" module>
  // What people are talking about, by place, language and topic. Seven days first; a quiet week widens to 30
  // days; with no labelled conversation at all it shows the most recorded things and says so.
  export type TalkedItem = {
    context: { id: string; slug: string; title: string; kind: string }
    posts: number
    threads: number
    people: number
    lead: { id: string; title: string } | null
  }
  export type Recorded = { id: string; slug: string; title: string; kind: string; indexed: number }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import { request } from './api'
  let { recorded, within = null }: { recorded: Recorded[]; within?: Set<string> | null } = $props()
  let items = $state<TalkedItem[] | null>(null),
    days = $state(7)
  onMount(() => {
    const abort = new AbortController()
    const load = (d: number) => request<{ days: number; items: TalkedItem[] }>('/v1/contexts/talked?days=' + d, undefined, abort.signal, true)
    load(7)
      .then(async (r) => (r.items.length >= 3 ? r : await load(30)))
      .then((r) => {
        items = r.items
        days = r.days
      })
      .catch(() => (items = []))
    return () => abort.abort()
  })
  const shown = $derived((items ?? []).filter((i) => !within || within.has(i.context.id)).slice(0, 6))
  const fallback = $derived(recorded.filter((c) => c.indexed > 0 && (!within || within.has(c.id))).sort((a, b) => b.indexed - a.indexed).slice(0, 6))
  const kindName: Record<string, string> = { place: 'Tempat', region: 'Wilayah', language: 'Bahasa', topic: 'Topik' }
  const ink = (kind: string) => (kind === 'language' ? 'language' : kind === 'topic' ? 'topic' : 'place')
</script>

{#if items === null}<p class="talked-note" role="status">Memuat…</p>
{:else if shown.length}<ol class="talked">
    {#each shown as t (t.context.id)}<li data-ink={ink(t.context.kind)}>
        <a class="talked-name" href={'/contexts/' + t.context.slug}><span class="talked-kind">{kindName[t.context.kind] ?? 'Topik'}</span>{t.context.title}</a>
        {#if t.lead}<a class="talked-lead" href={'/square/' + t.lead.id}>{t.lead.title}</a>{/if}
        <span class="talked-count">{t.threads} percakapan · {t.posts} posting{#if t.people} · {t.people} orang{/if}</span>
      </li>{/each}
  </ol>
  <p class="talked-note">Dari posting publik {days} hari terakhir yang berlabel tempat, bahasa atau topik.</p>
{:else if fallback.length}<p class="talked-note">Belum ada percakapan berlabel dalam {days} hari terakhir. Yang paling banyak tercatat:</p>
  <ol class="talked">
    {#each fallback as c (c.id)}<li data-ink={ink(c.kind)}>
        <a class="talked-name" href={'/contexts/' + c.slug}><span class="talked-kind">{kindName[c.kind] ?? 'Topik'}</span>{c.title}</a>
        <span class="talked-count">{c.indexed} catatan</span>
      </li>{/each}
  </ol>
{:else}<p class="talked-note">Belum ada percakapan berlabel. Label tempat, bahasa atau topik pada posting akan muncul di sini.</p>{/if}

<style>
  .talked { list-style: none; margin: 0; padding: 0 16px; display: grid; }
  .talked li {
    --ink: var(--brand);
    display: grid;
    gap: 3px;
    padding: 12px 0 13px;
    border-bottom: 1px solid var(--reading-line, var(--border));
  }
  .talked li[data-ink='language'] { --ink: oklch(0.5 0.13 42); }
  .talked li[data-ink='topic'] { --ink: oklch(0.47 0.09 158); }
  .talked-name { display: inline-flex; align-items: baseline; gap: 8px; font-size: 17px; font-weight: 650; color: var(--foreground); text-decoration: none; min-height: 28px; }
  .talked-kind { font-size: 12px; font-weight: 600; color: var(--ink); }
  .talked-lead { font-family: var(--font-editorial, inherit); font-size: 17px; line-height: 1.4; color: var(--foreground); text-decoration: none; max-width: 62ch; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .talked-name:hover, .talked-lead:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
  .talked a:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 4px; }
  .talked-count { font-size: 13px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .talked-note { margin: 10px 16px 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 66ch; }
  @media (min-width: 768px) { .talked { padding-inline: 24px; } .talked-note { margin-inline: 24px; } }
  :global(.dark) .talked li[data-ink='language'] { --ink: oklch(0.78 0.11 55); }
  :global(.dark) .talked li[data-ink='topic'] { --ink: oklch(0.74 0.1 158); }
</style>
