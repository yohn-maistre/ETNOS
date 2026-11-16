<script lang="ts">
  // Jejak: one path from what a page rests on to what it leads to. Each step is
  // a public record returned by GET /v1/wiki/:id/trail. The dashed last step
  // appears only when there is a real open action for this viewer.
  import { request, relativeDate } from './api'
  import { newsHeadline } from './wiki-sources'
  type Actor = { id: string; name: string; kind: string }
  type Step = {
    kind: 'sources' | 'note' | 'announced' | 'earlier' | 'proposed' | 'page' | 'work'
    at: number | null
    label: string
    actor?: Actor
    href?: string
    detail?: string
    state?: string
    items?: { href: string; label: string; news: boolean }[]
    contexts?: { slug: string; title: string }[]
  }
  let { pageId, canPropose, onPropose }: { pageId: string; canPropose: boolean; onPropose: () => void } = $props()
  const uid = $props.id()
  let steps = $state<Step[] | null>(null)
  $effect(() => {
    const id = pageId,
      abort = new AbortController()
    steps = null
    request<{ steps: Step[] }>('/v1/wiki/' + id + '/trail', undefined, abort.signal, true)
      .then((r) => {
        if (!abort.signal.aborted) steps = r.steps
      })
      .catch(() => {
        if (!abort.signal.aborted) steps = []
      })
    return () => abort.abort()
  })
  let titles = $state<Record<string, string>>({})
  $effect(() => {
    let live = true
    for (const item of steps?.find((s) => s.kind === 'sources')?.items ?? [])
      if (item.news) {
        const id = item.href.split('/').pop()!
        newsHeadline(id).then((h) => {
          if (live && h) titles = { ...titles, [item.href]: h.title }
        })
      }
    return () => {
      live = false
    }
  })
  function who(a: Actor | undefined) {
    return a ? a.name + (a.kind === 'agent' ? ' (agen)' : '') : ''
  }
  const kindLabel: Record<Step['kind'], string> = {
    sources: 'Sumber',
    note: 'Catatan kerja',
    announced: 'Diumumkan',
    earlier: 'Riwayat',
    proposed: 'Usulan yang diterima',
    page: 'Halaman ini',
    work: 'Kerja publik terbuka',
  }
  const firstWork = $derived(steps?.find((s) => s.kind === 'work'))
  const hasNext = $derived(canPropose || !!firstWork)
</script>

{#if steps?.length}
  <section class="wiki-trail" aria-labelledby={'wiki-trail-' + uid}>
    <h2 id={'wiki-trail-' + uid}>Jejak</h2>
    <p class="wiki-trail-intro">Asal halaman ini dan perubahan yang bisa menyusul.</p>
    <ol>
      {#each steps as step, i}
        <li class={'trail-step trail-' + step.kind} class:current={step.kind === 'page'} class:last={i === steps.length - 1 && !hasNext} aria-current={step.kind === 'page' ? 'step' : undefined}>
          <span class="trail-dot" aria-hidden="true">{i + 1}</span>
          <div class="trail-card">
            <small>{kindLabel[step.kind]}{step.at ? ', ' + relativeDate(step.at) : ''}{step.kind === 'page' ? ' · halaman ini' : ''}</small>
            {#if step.kind === 'sources'}
              <strong>{step.label}</strong>
              <ul>
                {#each step.items ?? [] as item}
                  <li><a href={item.href} target={item.news ? undefined : '_blank'} rel={item.news ? undefined : 'noreferrer'}>{item.news ? (titles[item.href] ?? 'Kabar') : item.label}</a></li>
                {/each}
              </ul>
            {:else if step.kind === 'note'}
              <a href={step.href}>{step.label}</a>
              <p>Ditulis {who(step.actor)} sebagai catatan kerja, lalu diusulkan ke Wiki.</p>
            {:else if step.kind === 'announced'}
              <a href={step.href}>{step.label}</a>
            {:else if step.kind === 'earlier'}
              <strong>{step.label}</strong>
              <p>Revisi pertama oleh {who(step.actor)}.</p>
            {:else if step.kind === 'proposed'}
              <strong>Ditulis oleh {who(step.actor)}</strong>
              {#if step.actor?.kind === 'agent'}<p>Ditulis oleh agen dan bisa ditinjau atau dikembalikan oleh pengelola.</p>{/if}
            {:else if step.kind === 'page'}
              <strong class="trail-title">{step.label}</strong>
              <p>Ditinjau {who(step.actor)}.</p>
              {#if step.contexts?.length}
                <p class="trail-contexts">{#each step.contexts as c, j}{j ? ', ' : ''}<a href={'/contexts/' + c.slug}>{c.title}</a>{/each}</p>
              {/if}
            {:else if step.kind === 'work'}
              <a href={step.href}>{step.label}</a>
              {#if step.detail}<p>Disponsori {step.detail}</p>{/if}
            {/if}
          </div>
        </li>
      {/each}
      {#if hasNext}
        <li class="trail-step trail-next last">
          <span class="trail-dot" aria-hidden="true">{steps.length + 1}</span>
          <div class="trail-card">
            <small>Belum terjadi</small>
            {#if canPropose}
              <p>Tambahan dan perbaikan dari siapa pun akan ditinjau oleh pengelola komunitas.</p>
              <button type="button" onclick={onPropose}>Usulkan perubahan</button>
            {:else if firstWork}
              <p>Ada kerja publik terbuka di tempat yang sama.</p>
              <a class="trail-action" href={firstWork.href}>Lihat kerja ini</a>
            {/if}
          </div>
        </li>
      {/if}
    </ol>
  </section>
{/if}
