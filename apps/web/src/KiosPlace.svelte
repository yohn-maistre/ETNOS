<script lang="ts">
  // "Kios di …" on a place entry (docs/plan/one-page-system-2026-11-21.md §7): open offers placed here or anywhere
  // below, from people and lembaga that opened a Kios. Only offers from public communities reach this list.
  import { ShoppingBag } from '@lucide/svelte'
  import { offerTitle, offerPrice } from './kios'
  import type { KiosPlaceItem } from './entri'

  let { items, place, rail = false }: { items: KiosPlaceItem[]; place: string; rail?: boolean } = $props()
  const uid = $props.id()
  const shown = $derived(items.slice(0, 8))
</script>

{#if items.length}
  <section class="kp" class:rail aria-labelledby={uid + '-kios'}>
    <h2 id={uid + '-kios'}>{#if !rail}<ShoppingBag size={18} aria-hidden="true" />{/if}Kios di {place}</h2>
    <ul>
      {#each shown as k (k.post.id)}{#if k.post.offering}<li>
          <a href={'/square/' + k.post.id}><strong>{offerTitle(k.post)}</strong><span>{offerPrice(k.post.offering)}{#if k.post.offering.unit}{' · '}{k.post.offering.unit}{/if}{#if k.post.offering.place && !rail && k.post.offering.place.title !== place}{' · '}{k.post.offering.place.title}{/if}</span></a>
          <a class="kp-seller" href={k.seller.href}>{k.seller.title}</a>
        </li>{/if}{/each}
    </ul>
    <p class="kp-foot">{rail ? 'Pembayaran tidak lewat ETNOS.' : 'Hubungi penjual lewat Pesan atau WhatsApp. Pembayaran tidak lewat ETNOS.'}</p>
  </section>
{/if}

<style>
  .kp { display: grid; gap: 8px; min-width: 0; }
  .kp h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 14px; font-weight: 650; }
  .kp:not(.rail) h2 { font-size: 18px; font-weight: 800; letter-spacing: -0.012em; }
  .kp ul { display: grid; margin: 0; padding: 0; list-style: none; }
  .kp li { display: grid; gap: 2px; padding: 9px 0; border-top: 1px solid var(--border); }
  .kp li:first-child { border-top: 0; }
  .kp:not(.rail) li { grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 4px 16px; padding: 12px 0; }
  .kp:not(.rail) li:first-child { border-top: 1px solid var(--border); }
  .kp li > a:first-child { display: grid; gap: 2px; color: inherit; text-decoration: none; min-width: 0; }
  .kp strong { font-size: 14.5px; font-weight: 650; line-height: 1.3; overflow-wrap: anywhere; }
  .kp li > a:first-child:hover strong { text-decoration: underline; text-underline-offset: 3px; }
  .kp span { font-size: 13.5px; font-variant-numeric: tabular-nums; color: var(--muted-foreground); }
  .kp-seller { font-size: 13px; color: var(--muted-foreground); text-decoration: none; }
  .kp-seller:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .kp-foot { margin: 0; font-size: 12.5px; color: var(--muted-foreground); }
  .kp a:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; border-radius: 4px; }
</style>
