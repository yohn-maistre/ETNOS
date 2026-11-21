<script lang="ts">
  // Lini masa: reviewed pages laid out by the period they are about, newest on
  // top, as one core sample. A band with nothing in it is drawn coarse and says so.
  import { request } from './api'
  import { bands, bandOf, periodLabel, type Period } from './period'
  type Entry = Period & { id: string; title: string; excerpt: string }
  let entries = $state<Entry[] | null>(null)
  let failed = $state(false)
  $effect(() => {
    const abort = new AbortController()
    request<Entry[]>('/v1/wiki/timeline', undefined, abort.signal, true)
      .then((r) => (entries = r))
      .catch(() => {
        if (!abort.signal.aborted) failed = true
      })
    return () => abort.abort()
  })
  const grouped = $derived(bands.map((b) => ({ ...b, items: (entries ?? []).filter((e) => bandOf(e.from) === b.id) })))
</script>

<article class="timeline">
  <header>
    <h1>Lini masa</h1>
    <p>Halaman yang sudah ditinjau, disusun menurut masa yang dibahasnya. Makin ke bawah makin lampau.</p>
  </header>
  {#if failed}<p class="tl-state" role="status">Lini masa belum bisa dimuat. Coba lagi sebentar.</p>
  {:else if !entries}<p class="tl-state" role="status">Memuat…</p>
  {:else if !entries.length}
    <!-- Four empty bands say nothing a single line cannot. -->
    <p class="tl-state">
      Belum ada halaman yang diberi masa. Peninjau komunitas menetapkan masa di bagian bawah setiap halaman wiki.
      <a href="/wiki">Buka Ensiklopedia</a>
    </p>
  {:else}
    {#each grouped as band (band.id)}
      <section class="tl-band" aria-labelledby={'tl-' + band.id}>
        <div class="tl-depth" class:coarse={!band.items.length} aria-hidden="true">
          {#if band.tick}<span>{band.tick}</span>{/if}
        </div>
        <div class="tl-content">
          <h2 id={'tl-' + band.id}>{band.label}</h2>
          {#each band.items as e (e.id)}
            <a class="tl-item" href={'/wiki/' + e.id}>
              <small>{periodLabel(e)}{e.note ? ' · ' + e.note : ''}</small>
              <strong>{e.title}</strong>
              {#if e.excerpt}<span>{e.excerpt}</span>{/if}
            </a>
          {:else}
            <p class="tl-empty">Belum ada halaman untuk masa ini.</p>
          {/each}
        </div>
      </section>
    {/each}
    <p class="tl-foot">
      Masa sebuah halaman ditetapkan oleh peninjau komunitasnya. Halaman tanpa masa tidak tampil di sini.
      <a href="/wiki">Buka Ensiklopedia</a>
    </p>
  {/if}
</article>

<style>
  .timeline { --paper: #f4f0e5; --ink: var(--brand); --surface: #fbfbf8; --tl-text: #1a211e; --tl-muted: #5a635e; background: var(--paper); color: var(--tl-text); min-height: 100%; }
  :global(.dark) .timeline { --paper: color-mix(in srgb, var(--brand) 10%, var(--background)); --surface: var(--card, var(--secondary)); --tl-text: var(--foreground); --tl-muted: var(--muted-foreground); }
  header { padding: 22px 16px 16px; border-bottom: 1px solid color-mix(in srgb, var(--ink) 45%, transparent); }
  h1 { margin: 0 0 6px; font-family: var(--font-editorial); font-weight: 400; font-size: clamp(28px, 6vw, 38px); line-height: 1.15; letter-spacing: -.5px; }
  header p { margin: 0; max-width: 60ch; font-size: 14px; line-height: 1.55; color: var(--tl-muted); }
  .tl-band { display: grid; grid-template-columns: 56px minmax(0, 1fr); }
  .tl-depth { position: relative; border-right: 1px solid var(--ink); color: var(--ink); background-image: radial-gradient(color-mix(in srgb, currentColor 75%, transparent) 1.1px, transparent 1.2px); background-size: 6px 6px; }
  .tl-depth.coarse { background-image: linear-gradient(45deg, color-mix(in srgb, var(--ink) 26%, transparent) 25%, transparent 25%, transparent 75%, color-mix(in srgb, var(--ink) 26%, transparent) 75%), linear-gradient(45deg, color-mix(in srgb, var(--ink) 14%, transparent) 25%, transparent 25%, transparent 75%, color-mix(in srgb, var(--ink) 14%, transparent) 75%); background-size: 22px 22px; background-position: 0 0, 11px 11px; }
  .tl-depth span { position: absolute; left: 6px; top: 10px; padding: 0 3px; background: var(--paper); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .tl-content { padding: 18px 16px 12px; min-width: 0; }
  h2 { margin: 0 0 10px; font-size: 12px; font-weight: 600; letter-spacing: .02em; color: var(--ink); }
  :global(.dark) .timeline h2, :global(.dark) .tl-depth span { color: color-mix(in srgb, var(--ink) 55%, var(--foreground)); }
  .tl-item { display: grid; gap: 4px; min-height: 44px; margin-bottom: 10px; padding: 12px 14px; border-radius: 12px; background: var(--surface); color: var(--tl-text); text-decoration: none; box-shadow: 0 1px 0 rgba(26, 33, 30, .06); }
  .tl-item:hover strong { text-decoration: underline; }
  .tl-item:focus-visible, .tl-foot a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
  .tl-item small { font-size: 12px; color: var(--tl-muted); font-variant-numeric: tabular-nums; }
  .tl-item strong { font-family: var(--font-editorial); font-weight: 400; font-size: 19px; line-height: 1.25; overflow-wrap: anywhere; }
  .tl-item span { font-size: 14px; line-height: 1.5; color: var(--tl-muted); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .tl-empty { margin: 0 0 14px; min-height: 56px; font-size: 14px; color: var(--tl-muted); }
  .tl-state, .tl-foot { margin: 0; padding: 18px 16px 28px; font-size: 14px; line-height: 1.55; color: var(--tl-muted); max-width: 64ch; }
  .tl-foot { border-top: 1px solid color-mix(in srgb, var(--ink) 45%, transparent); }
  .tl-foot a, .tl-state a { color: inherit; text-decoration: underline; text-underline-offset: 3px; display: inline-flex; min-height: 44px; align-items: center; }
  @media (min-width: 720px) { .tl-band { grid-template-columns: 72px minmax(0, 1fr); } header, .tl-content, .tl-state, .tl-foot { padding-inline: 22px; } }
</style>
