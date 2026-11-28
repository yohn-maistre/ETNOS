<script lang="ts" module>
  // What people are talking about, by place, language and topic. Seven days first; a quiet week widens to 30
  // days; with no labelled conversation at all it shows the most recorded things and says so.
  export type TalkedItem = {
    context: { id: string; slug: string; title: string; kind: string }
    posts: number
    threads: number
    people: number
    lead: { id: string; title: string; image?: string | null } | null
  }
  export type Recorded = { id: string; slug: string; title: string; kind: string; indexed: number }
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import { request, type Community } from './api'
  import ExploreRow from './ExploreRow.svelte'
  import type { Ctx } from './explore-data'
  let {
    recorded,
    within = null,
    communities = [],
  }: { recorded: Ctx[]; within?: Set<string> | null; communities?: Community[] } = $props()
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
  const SIZE = 8
  const kindName: Record<string, string> = { place: 'Kabupaten', region: 'Wilayah adat', language: 'Bahasa', topic: 'Topik' }
  const admission: Record<string, string> = { open: 'Terbuka', approval: 'Perlu persetujuan', invite: 'Dengan undangan' }
  type Row = { key: string; title: string; text?: string; meta: string; href: string; image?: string | null }

  const talked = $derived(
    (items ?? [])
      .filter((i) => !within || within.has(i.context.id))
      .slice(0, SIZE)
      .map<Row>((t) => ({
        key: 'c' + t.context.id,
        title: t.context.title,
        text: t.lead?.title || undefined,
        meta: [kindName[t.context.kind] ?? 'Topik', t.people + ' orang', t.threads + ' percakapan'].join(' · '),
        href: t.lead ? '/square/' + t.lead.id : '/wiki/' + t.context.slug,
        image: t.lead?.image ?? null,
      })),
  )
  // A quiet week leaves the list short. The most recorded topics, places and languages fill it, then communities.
  const filler = $derived.by(() => {
    const used = new Set((items ?? []).map((i) => i.context.id))
    const rows: Row[] = recorded
      .filter((c) => c.indexed > 0 && !used.has(c.id) && (!within || within.has(c.id)))
      .sort((a, b) => b.indexed - a.indexed)
      .map((c) => ({ key: 'x' + c.id, title: c.title, meta: (kindName[c.kind] ?? 'Topik') + ' · ' + c.indexed + ' catatan', href: '/wiki/' + c.slug }))
    const rooms: Row[] = communities.map((c) => ({ key: 'k' + c.id, title: c.title, text: c.description, meta: 'Komunitas · ' + (admission[c.admission] ?? ''), href: '/communities/' + c.id }))
    // Alternate, so one kind does not take the whole list.
    const mixed: Row[] = []
    for (let i = 0; mixed.length < rows.length + rooms.length; i++) {
      if (rows[i]) mixed.push(rows[i])
      if (rooms[i]) mixed.push(rooms[i])
    }
    return mixed
  })
  const shown = $derived(talked.length >= 3 ? talked : [...talked, ...filler].slice(0, SIZE))
</script>

{#if items === null}<p class="talked-note" role="status">Memuat…</p>
{:else if shown.length}
  {#if !talked.length}<p class="talked-note lead">Belum ada percakapan berlabel dalam {days} hari terakhir. Daftar ini berisi topik, tempat dan komunitas yang paling ramai.</p>{/if}
  <ul class="open-list talked-list">
    {#each shown as r (r.key)}<ExploreRow title={r.title} text={r.text} meta={r.meta} href={r.href} image={r.image} />{/each}
  </ul>
  {#if talked.length}<p class="talked-note">Dari posting publik {days} hari terakhir yang berlabel tempat, bahasa atau topik.</p>{/if}
{:else}<p class="talked-note">Belum ada percakapan berlabel. Label tempat, bahasa atau topik pada posting akan muncul di sini.</p>{/if}

<style>
  .talked-note { margin: 12px 0 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); max-width: 62ch; }
  .talked-note.lead { margin: 0 0 6px; }
</style>
