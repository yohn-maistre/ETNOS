<script lang="ts" module>
  export type CommunityKind = {
    slug: string
    title: string
    description: string
    examples: string[]
    visibility: 'public' | 'listed-private'
    admission: 'open' | 'approval' | 'invite'
  }
</script>

<script lang="ts">
  // Jenis komunitas: the forms of association this deployment's catalogue offers.
  // Choosing one only fills in defaults; every field below stays editable.
  import { request } from './api'
  let { value = $bindable(''), onPick }: { value: string; onPick: (kind: CommunityKind | null) => void } = $props()
  let kinds = $state<CommunityKind[]>([])
  $effect(() => {
    const abort = new AbortController()
    request<{ communityKinds?: CommunityKind[] }>('/v1/contexts/catalogue', undefined, abort.signal, true)
      .then((r) => (kinds = r.communityKinds ?? []))
      .catch(() => {})
    return () => abort.abort()
  })
  const chosen = $derived(kinds.find((k) => k.slug === value))
  function pick(kind: CommunityKind | null) {
    value = kind?.slug ?? ''
    onPick(kind)
  }
</script>

{#if kinds.length}
  <fieldset class="kind-picker">
    <legend>Komunitas seperti apa?</legend>
    <div class="kind-options" role="radiogroup" aria-label="Jenis komunitas">
      {#each kinds as k (k.slug)}
        <button type="button" role="radio" aria-checked={value === k.slug} class:on={value === k.slug} onclick={() => pick(value === k.slug ? null : k)}>
          {k.title}
        </button>
      {/each}
    </div>
    <p aria-live="polite">
      {#if chosen}{chosen.description} <span>Misalnya: {chosen.examples.join(', ')}.</span>
      {:else}Pilih yang paling dekat, atau lewati. Jenis bisa diubah nanti dari halaman komunitas.{/if}
    </p>
  </fieldset>
{/if}

<style>
  .kind-picker { margin: 0; padding: 0; border: 0; display: grid; gap: 8px; min-width: 0; }
  legend { padding: 0; margin-bottom: 8px; font-size: 14px; font-weight: 600; }
  .kind-options { display: flex; flex-wrap: wrap; gap: 6px; }
  button { min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: none; color: inherit; font: inherit; font-size: 14px; font-weight: 500; cursor: pointer; }
  button:hover { border-color: var(--brand); }
  button.on { background: var(--foreground); color: var(--background); border-color: var(--foreground); }
  button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
  p { margin: 0; min-height: 3.1em; font-size: 13px; line-height: 1.55; color: var(--muted-foreground); }
  p span { display: block; }
</style>
