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
  import ExploreTile from './ExploreTile.svelte'
  import RegionArt, { type Atlas } from './RegionArt.svelte'
  import WordArt from './WordArt.svelte'
  import { regionsOf, type AtlasLang, type Ctx } from './explore-data'
  let {
    recorded,
    within = null,
    atlas = null,
    langs = [],
  }: { recorded: Ctx[]; within?: Set<string> | null; atlas?: Atlas | null; langs?: AtlasLang[] } = $props()
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
  const shown = $derived((items ?? []).filter((i) => !within || within.has(i.context.id)).slice(0, 8))
  const fallback = $derived(recorded.filter((c) => c.indexed > 0 && (!within || within.has(c.id))).sort((a, b) => b.indexed - a.indexed).slice(0, 8))
  const kindName: Record<string, string> = { place: 'Kabupaten', region: 'Wilayah adat', language: 'Bahasa', topic: 'Topik' }
  const tone = (kind: string) => (kind === 'language' ? 'language' : kind === 'topic' ? 'topic' : 'place') as 'place' | 'language' | 'topic'
</script>

{#snippet artFor(c: { slug: string; title: string; kind: string })}
  {#if (c.kind === 'place' || c.kind === 'region') && atlas}<RegionArt {atlas} lit={regionsOf(c.slug, recorded, langs)} />
  {:else}<WordArt words={[c.title]} />{/if}
{/snippet}

{#if items === null}<p class="talked-note" role="status">Memuat…</p>
{:else if shown.length}<div class="explore-strip">
    {#each shown as t (t.context.id)}<ExploreTile
        tone={tone(t.context.kind)}
        href={t.lead ? '/square/' + t.lead.id : '/contexts/' + t.context.slug}
        title={t.lead?.title || t.context.title}
        text={(kindName[t.context.kind] ?? 'Topik') + ' · ' + t.context.title}
        meta={t.threads + ' percakapan · ' + t.posts + ' posting' + (t.people ? ' · ' + t.people + ' orang' : '')}
      >
        {#snippet art()}{@render artFor(t.context)}{/snippet}
      </ExploreTile>{/each}
  </div>
  <p class="talked-note">Dari posting publik {days} hari terakhir yang berlabel tempat, bahasa atau topik.</p>
{:else if fallback.length}<p class="talked-note lead">Belum ada percakapan berlabel dalam {days} hari terakhir. Yang paling banyak tercatat:</p>
  <div class="explore-strip">
    {#each fallback as c (c.id)}<ExploreTile tone={tone(c.kind)} href={'/contexts/' + c.slug} title={c.title} text={kindName[c.kind] ?? 'Topik'} meta={c.indexed + ' catatan'}>
        {#snippet art()}{@render artFor(c)}{/snippet}
      </ExploreTile>{/each}
  </div>
{:else}<p class="talked-note">Belum ada percakapan berlabel. Label tempat, bahasa atau topik pada posting akan muncul di sini.</p>{/if}

<style>
  .talked-note { margin: 10px 16px 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  .talked-note.lead { margin: 0 16px 10px; }
  @media (min-width: 768px) { .talked-note, .talked-note.lead { margin-inline: 24px; } }
</style>
