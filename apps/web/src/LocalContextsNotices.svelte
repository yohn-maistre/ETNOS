<script lang="ts">
  // Local Contexts Notices for the collections a page shows, as plain-text badges that link to localcontexts.org,
  // each with one line in Indonesian. The official icons are not used until Abstraksi is registered on the Hub;
  // they are not redrawn either. Labels are a community's own: when a Hub project is linked, the page links to it
  // and shows no Label of its own (docs/decisions/local-contexts-2026-11-28.md).
  import { ArrowUpRight } from '@lucide/svelte'
  import { loadLocalContexts, type LcCollection } from './local-contexts.ts'

  let { keys, title = 'Local Contexts' }: { keys: string[]; title?: string } = $props()
  let all = $state<LcCollection[]>([])
  $effect(() => { void loadLocalContexts().then((c) => (all = c)) })
  const shown = $derived(keys.map((k) => all.find((c) => c.key === k)).filter((c): c is LcCollection => !!c && (c.notices.length > 0 || !!c.hub)))
</script>

{#if shown.length}
  <section class="lcn" aria-label={title}>
    <p class="lcn-head">{title}</p>
    <ul>
      {#each shown as c (c.key)}
        <li>
          <span class="lcn-name">{c.title}</span>
          {#each c.notices as n (n.kind)}
            <span class="lcn-row">
              <a class="lcn-badge" href={n.url} target="_blank" rel="noopener">{n.name}<ArrowUpRight size={13} aria-hidden="true" /></a>
              <span class="lcn-text">{n.text}</span>
            </span>
          {/each}
          {#if c.hub}
            <span class="lcn-row">
              <a class="lcn-badge" href={c.hub.url} target="_blank" rel="noopener">Proyek di Local Contexts Hub<ArrowUpRight size={13} aria-hidden="true" /></a>
              <span class="lcn-text">Label dari komunitas untuk koleksi ini dipasang dan ditampilkan di Hub.</span>
            </span>
          {/if}
        </li>
      {/each}
    </ul>
    <p class="lcn-foot">Notice dipasang oleh lembaga atau peneliti. Label hanya dipasang oleh komunitas sendiri lewat <a href="https://localcontexts.org/labels/about-the-labels/" target="_blank" rel="noopener">Local Contexts</a>, dan ETNOS tidak pernah memasang Label atas nama komunitas.</p>
  </section>
{/if}

<style>
  .lcn { display: grid; gap: 10px; min-width: 0; }
  .lcn-head { margin: 0; font-size: 13px; font-weight: 650; color: var(--muted-foreground); }
  .lcn ul { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
  .lcn li { display: grid; gap: 6px; min-width: 0; }
  .lcn-name { font-size: 14px; font-weight: 650; }
  .lcn-row { display: grid; gap: 4px; justify-items: start; min-width: 0; }
  .lcn-badge { display: inline-flex; align-items: center; gap: 4px; min-height: 28px; padding: 0 10px; border: 1px solid var(--border); border-radius: 999px; color: var(--foreground); font-size: 12.5px; font-weight: 600; text-decoration: none; }
  .lcn-badge:hover { background: color-mix(in oklab, var(--foreground) 4%, transparent); }
  .lcn-badge:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .lcn-text { font-size: 13.5px; line-height: 1.45; color: color-mix(in oklab, var(--foreground) 78%, var(--background)); }
  .lcn-foot { margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--muted-foreground); }
  .lcn-foot a { color: inherit; text-underline-offset: 3px; }
</style>
