<script lang="ts">
  // What a community says about itself on its page: what it is about or where it is, the languages people write in,
  // and the lembaga that runs it. The labels are public and grant nothing. They are edited in one place, the
  // community settings (CommunityLabels.svelte); a steward gets a link there.
  import { MapPin, Languages, Building2 } from '@lucide/svelte'
  import { request } from './api'
  type Ctx = { id: string; slug: string; title: string; kind: string; facet?: string; role?: 'about' | 'language' }
  let { communityId, steward, hidden, onEdit, tick = 0 }: { communityId: string; steward: boolean; hidden: boolean; onEdit?: () => void; tick?: number } = $props()
  let labels = $state<Ctx[]>([]),
    group = $state<{ id: string; title: string } | null>(null)
  $effect(() => {
    const id = communityId,
      _t = tick,
      abort = new AbortController()
    request<{ contexts?: Ctx[]; group?: { id: string; title: string } | null }>('/v1/communities/' + id, undefined, abort.signal, true)
      .then((c) => {
        if (abort.signal.aborted) return
        labels = c.contexts ?? []
        group = c.group ?? null
      })
      .catch(() => {})
    return () => abort.abort()
  })
  const about = $derived(labels.filter((l) => l.role !== 'language'))
  const languages = $derived(labels.filter((l) => l.role === 'language'))
</script>

{#if labels.length || group || (steward && !hidden && onEdit)}
  <div class="community-places">
    {#if about.length}
      <div class="cp-chips" aria-label="Tentang apa atau di mana">
        {#each about as c (c.id)}<a href={'/wiki/' + c.slug}>{#if c.kind === 'place' || c.kind === 'region'}<MapPin size={13} aria-hidden="true" />{/if}{c.title}</a>{/each}
      </div>
    {/if}
    {#if languages.length || group}<p class="cp-line">
        {#if languages.length}<span><Languages size={14} aria-hidden="true" />Ditulis dalam bahasa {#each languages as l, i (l.id)}{#if i}{i === languages.length - 1 ? ' dan ' : ', '}{/if}<a href={'/wiki/' + l.slug}>{l.title}</a>{/each}</span>{/if}
        {#if group}<span><Building2 size={14} aria-hidden="true" />Dikelola oleh <a href={'/groups/' + group.id}>{group.title}</a></span>{/if}
      </p>{/if}
    {#if steward && onEdit && !hidden}<button type="button" class="cp-edit" onclick={onEdit}>{labels.length ? 'Atur label' : 'Tandai tempat, topik dan bahasa komunitas ini'}</button>{/if}
  </div>
{/if}

<style>
  .community-places { margin-top: 12px; display: grid; gap: 8px; justify-items: start; }
  .cp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .cp-chips a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; color: var(--foreground); text-decoration: none; }
  .cp-chips a:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .cp-line { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .cp-line span { display: inline; }
  .cp-line :global(svg) { display: inline-block; vertical-align: -2px; margin-right: 5px; }
  .cp-line a { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); }
  .cp-edit { min-height: 32px; padding: 0; border: 0; background: none; color: var(--muted-foreground); font: inherit; font-size: 13px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
  .cp-edit:hover { color: var(--foreground); }
  .cp-edit:focus-visible, .community-places a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; border-radius: 4px; }
</style>
