<script lang="ts">
  // Cetak kamus: the community's checked Kamus as a printable page, for schools and kampung with poor signal. The
  // browser's own print dialog makes the PDF. Every sense keeps its source and licence.
  import { onMount } from 'svelte'
  import { Printer, X } from '@lucide/svelte'
  import { Portal } from 'bits-ui'
  import { request } from './api'
  type Entry = { id: string; lemma: string; gloss: string; pos: string; context: string; source: string; licence: string; page: number | null; variants: { form: string; dialect: string }[]; dialect: string; examples: { postId: string; text: string }[] }
  let { communityId, title, onClose }: { communityId: string; title: string; onClose: () => void } = $props()
  let entries = $state<Entry[] | null>(null),
    language = $state(''),
    failed = $state(false)
  let close = $state<HTMLButtonElement | null>(null)
  onMount(() => {
    close?.focus()
    request<{ settings: { languageName: string }; entries: Entry[] }>(`/v1/communities/${encodeURIComponent(communityId)}/kamus?state=checked&limit=400`, undefined, undefined, true)
      .then((r) => { entries = r.entries.sort((a, b) => a.lemma.localeCompare(b.lemma, 'id')); language = r.settings.languageName })
      .catch(() => (failed = true))
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  })
  const groups = $derived.by(() => {
    const out = new Map<string, Entry[]>()
    for (const e of entries ?? []) { const k = e.lemma.slice(0, 1).toUpperCase(); out.set(k, [...(out.get(k) ?? []), e]) }
    return [...out]
  })
  const sourceOf = (e: Entry) => e.source === 'room' || e.source === 'concept' ? 'Ditulis anggota' : e.source.replace(/^seed:/, '').replace('steltenpool1969', 'Steltenpool 1969').replace('tng', 'TransNewGuinea.org') + (e.page ? ', hlm. ' + e.page : '')
  const licences = $derived([...new Set((entries ?? []).map((e) => e.licence).filter(Boolean))])
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
</script>

<Portal>
<div class="kamus-print" role="dialog" aria-modal="true" aria-labelledby="kp-title">
  <div class="kp-bar">
    <button type="button" bind:this={close} class="kp-close" onclick={onClose}><X size={18} aria-hidden="true" />Tutup</button>
    <button type="button" class="kp-print" disabled={!entries?.length} onclick={() => print()}><Printer size={17} aria-hidden="true" />Cetak atau simpan PDF</button>
  </div>
  <article class="kp-page">
    <header>
      <h1 id="kp-title">Kamus {language || 'komunitas'}</h1>
      <p>{title}. Dicetak {today}. Kamus ini memuat kata yang sudah diperiksa anggota komunitas.</p>
    </header>
    {#if failed}<p>Kamus belum bisa dimuat.</p>
    {:else if !entries}<p>Memuat…</p>
    {:else if !entries.length}<p>Belum ada kata yang sudah diperiksa.</p>
    {:else}
      <div class="kp-cols">
        {#each groups as [letter, list] (letter)}
          <section>
            <h2>{letter}</h2>
            {#each list as e (e.id)}
              <p class="kp-entry"><b>{e.lemma}</b>{#if e.variants.length}{' '}<span class="kp-var">({e.variants.map((v) => v.form).join(', ')})</span>{/if}{#if e.pos}{' '}<i>{e.pos}</i>{/if}{' '}{e.gloss}.{#if e.examples[0]}{' '}<span class="kp-ex">{e.examples[0].text}</span>{/if}{' '}<span class="kp-src">{sourceOf(e)}</span></p>
            {/each}
          </section>
        {/each}
      </div>
      <footer>
        <p>{entries.length} kata. {#if licences.length}Lisensi sumber tertulis: {licences.join(', ')}. Kata dari Steltenpool 1969 berlisensi CC BY-NC, jadi cetakan ini tidak boleh dijual.{/if} Kata yang ditulis anggota adalah milik komunitas {title}.</p>
      </footer>
    {/if}
  </article>
</div>
</Portal>

<style>
  .kamus-print { position: fixed; inset: 0; z-index: 70; overflow-y: auto; background: var(--page-ground, var(--background)); color: var(--foreground); }
  .kp-bar { position: sticky; top: 0; display: flex; justify-content: space-between; gap: 8px; padding: 10px 16px; background: color-mix(in oklab, var(--background) 86%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
  .kp-bar button { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer; }
  .kp-bar .kp-print { border-color: transparent; background: var(--foreground); color: var(--background); }
  .kp-bar button:disabled { opacity: 0.5; }
  .kp-bar button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .kp-page { max-width: 820px; margin: 20px auto 48px; padding: 36px 40px; background: #fff; color: #171717; border-radius: 4px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.12); font-size: 13px; line-height: 1.45; }
  @media (max-width: 640px) { .kp-page { margin: 12px; padding: 22px 18px; } }
  .kp-page h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
  .kp-page header p { margin: 6px 0 18px; color: #555; }
  .kp-cols { columns: 2; column-gap: 28px; }
  @media (max-width: 640px) { .kp-cols { columns: 1; } }
  .kp-cols h2 { margin: 10px 0 4px; font-size: 18px; font-weight: 800; break-after: avoid; }
  .kp-entry { margin: 0 0 6px; break-inside: avoid; }
  .kp-entry b { font-weight: 750; }
  .kp-var, .kp-src { color: #555; }
  .kp-src { font-size: 11px; }
  .kp-ex { font-style: italic; }
  .kp-page footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #ddd; color: #555; font-size: 11.5px; }
  @media print {
    :global(body *) { visibility: hidden; }
    .kamus-print, .kamus-print :global(*) { visibility: visible; }
    .kamus-print { position: absolute; inset: 0; overflow: visible; background: #fff; }
    .kp-bar { display: none; }
    .kp-page { margin: 0; padding: 0; max-width: none; box-shadow: none; }
  }
</style>
