<script lang="ts">
  // "Tandai …?" after a public post (docs/plan/one-page-system-2026-11-21.md §4): one compact card at a time for a
  // name found in the post by the matcher. Ya tags the post; Tidak moves on. A name that two entries share asks the
  // author to pick one by its kind. Nothing is ever tagged without a tap.
  import { X } from '@lucide/svelte'
  import { Button } from '$lib/components/ui/button/index.js'
  import { tandai, answerTandai, closeTandai } from './tentang.svelte.ts'

  const item = $derived(tandai.items[0] ?? null)
  const name = $derived(item?.entries[0]?.title ?? item?.text ?? '')
</script>

{#if item}<div class="tandai" role="dialog" aria-modal="false" aria-labelledby="tandai-question">
    <div class="tandai-head">
      <p id="tandai-question">Tandai <strong>{name}</strong>?</p>
      <button type="button" class="tandai-close" aria-label="Tutup saran" onclick={closeTandai}><X size={16} /></button>
    </div>
    {#if item.entries.length === 1}<p class="tandai-note">Posting ini akan tampil di halaman {item.entries[0].title} di Ensiklopedia.</p>
      <div class="tandai-actions">
        <Button size="sm" disabled={tandai.busy} onclick={() => answerTandai(item.entries[0].slug)}>Ya</Button>
        <Button size="sm" variant="ghost" disabled={tandai.busy} onclick={() => answerTandai(null)}>Tidak</Button>
      </div>
    {:else}<p class="tandai-note">Ada {item.entries.length} entri dengan nama ini. Pilih yang kamu maksud.</p>
      <div class="tandai-actions">
        {#each item.entries as e (e.slug)}<Button size="sm" variant="outline" disabled={tandai.busy} onclick={() => answerTandai(e.slug)}>{e.label}</Button>{/each}
        <Button size="sm" variant="ghost" disabled={tandai.busy} onclick={() => answerTandai(null)}>Tidak</Button>
      </div>{/if}
    {#if tandai.error}<p class="tandai-error" role="alert">{tandai.error}</p>{/if}
  </div>{/if}

<style>
  .tandai { position: fixed; z-index: 60; left: 50%; bottom: 24px; transform: translateX(-50%); width: min(400px, calc(100vw - 24px)); display: grid; gap: 6px; padding: 14px 14px 12px 16px; border: 1px solid var(--border); border-radius: 16px; background: var(--popover, var(--card)); color: var(--popover-foreground, var(--foreground)); box-shadow: 0 10px 30px -12px color-mix(in oklab, #000 40%, transparent), 0 2px 6px -2px color-mix(in oklab, #000 14%, transparent); animation: tandai-in 220ms cubic-bezier(0.16, 1, 0.3, 1); }
  @media (max-width: 767px) { .tandai { bottom: calc(96px + env(safe-area-inset-bottom, 0px)); } }
  @keyframes tandai-in { from { opacity: 0; transform: translate(-50%, 8px); } }
  @media (prefers-reduced-motion: reduce) { .tandai { animation: none; } }
  .tandai-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .tandai-head p { margin: 0; font-size: 15px; line-height: 1.35; }
  .tandai-head strong { font-weight: 700; }
  .tandai-close { display: inline-grid; place-items: center; width: 32px; height: 32px; margin: -6px -4px -6px 0; border: 0; border-radius: 999px; background: none; color: var(--muted-foreground); cursor: pointer; }
  .tandai-close:hover { background: color-mix(in oklab, var(--foreground) 6%, transparent); color: var(--foreground); }
  .tandai-close:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .tandai-note { margin: 0; font-size: 13.5px; line-height: 1.4; color: var(--muted-foreground); }
  .tandai-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .tandai-error { margin: 0; font-size: 13px; color: var(--destructive); }
</style>
