<script lang="ts">
  // The top of a community page with a Kamus, for its members: the notice card once ten or more questions are open,
  // Kata hari ini (a concept of the Leipzig-Jakarta list asked in Indonesian), a picture question from the Penampil,
  // and the Mode belajar switch. Every answer becomes a Periksa claim; nothing is published from one answer.
  import { onMount } from 'svelte'
  import { ListChecks, Send } from '@lucide/svelte'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import { request } from './api'
  import { kamus, setLearn, refreshAnnotations } from './kamus-posts.svelte.ts'
  import PeriksaDeck from './PeriksaDeck.svelte'

  type Answer = { claimId: string; form: string; state: string; yes: number; mine: string | null; proposedByMe: boolean }
  type Today = {
    language: string; publicNames: boolean
    concept: { n: number; prompt: string; english: string; source: string; answers: Answer[] } | null
    picture: { slug: string; title: string; scientific: string | null; thumb: string; entry: string; kind: string; answers: Answer[] } | null
  }
  let { communityId }: { communityId: string } = $props()
  let notice = $state<{ open: number; week: number; quorum: number } | null>(null),
    today = $state<Today | null>(null),
    deck = $state<PeriksaDeck | null>(null),
    word = $state(''),
    name = $state(''),
    busy = $state(''),
    status = $state('')
  const base = $derived('/v1/communities/' + encodeURIComponent(communityId) + '/kamus')

  async function load() {
    request<{ open: number; week: number; quorum: number }>(base + '/questions', undefined, undefined, true).then((r) => (notice = r)).catch(() => (notice = null))
    request<Today>(base + '/today', undefined, undefined, true).then((r) => (today = r)).catch(() => (today = null))
  }
  onMount(load)
  async function answerToday(body: Record<string, unknown>, label: string) {
    if (busy) return
    busy = label; status = ''
    try {
      today = await request<Today>(base + '/today', body)
      status = 'Jawaban kamu tercatat. Kata ini masuk kamus setelah ' + (notice?.quorum ?? 2) + ' anggota setuju.'
      if (label === 'concept') word = ''
      if (label === 'picture') name = ''
    } catch (e) { status = e instanceof Error ? e.message : 'Jawaban belum terkirim. Coba lagi.' } finally { busy = '' }
  }
  const agreed = (a: Answer) => a.mine === 'yes' || a.proposedByMe
</script>

{#snippet answers(list: Answer[], send: (form: string) => void)}
  {#if list.length}<ul class="kt-answers" aria-label="Jawaban anggota">
      {#each list as a (a.claimId)}<li>
          <span class="kt-answer-word">{a.form}</span>
          <span class="kt-answer-n">{a.state === 'checked' ? 'Sudah diperiksa' : a.yes ? a.yes + ' setuju' : 'Baru diusulkan'}</span>
          {#if a.state !== 'checked'}{#if agreed(a)}<span class="kt-mine">Jawaban kamu</span>{:else}<button type="button" disabled={!!busy} onclick={() => send(a.form)}>Setuju</button>{/if}{/if}
        </li>{/each}
    </ul>{/if}
{/snippet}

<section class="kamus-top" aria-label="Kamus komunitas">
  {#if notice && notice.open >= 10}
    <div class="kt-notice">
      <ListChecks size={20} aria-hidden="true" />
      <p>{#if notice.week}<strong>{notice.week} kata baru</strong> minggu ini.{:else}<strong>{notice.open} kata</strong> menunggu jawaban.{/if} Bantu periksa.</p>
      <button type="button" onclick={() => deck?.begin()}>Periksa</button>
    </div>
  {/if}

  {#if today && (today.concept || today.picture)}
    <div class="kt-row">
      {#if today.concept}{@const c = today.concept}
        <article class="kt-card" aria-labelledby="kt-today">
          <h3 id="kt-today">Kata hari ini</h3>
          <p class="kt-ask">Apa kata {today.language || 'daerah'} untuk <strong>{c.prompt}</strong>?</p>
          {@render answers(c.answers, (form) => answerToday({ concept: c.n, text: form }, 'concept'))}
          <form class="kt-form" onsubmit={(e) => { e.preventDefault(); if (word.trim()) void answerToday({ concept: c.n, text: word }, 'concept') }}>
            <label class="sr-only" for="kt-word">Kata {today.language} untuk {c.prompt}</label>
            <input id="kt-word" bind:value={word} maxlength="40" autocomplete="off" placeholder="Tulis katanya" />
            <button type="submit" aria-label="Kirim" disabled={!!busy || !word.trim()}><Send size={17} aria-hidden="true" /></button>
          </form>
          <p class="kt-source">Daftar konsep Leipzig-Jakarta dari Concepticon, CC BY 4.0.</p>
        </article>
      {/if}
      {#if today.picture}{@const p = today.picture}
        <article class="kt-card kt-pic" aria-labelledby="kt-pic">
          <a class="kt-photo" href={'/wiki/' + encodeURIComponent(p.entry)}><img src={p.thumb} alt={p.title} loading="lazy" width="96" height="96" /></a>
          <div class="kt-pic-body">
            <h3 id="kt-pic">Apa nama {p.kind} ini dalam bahasa {today.language || 'daerah'}?</h3>
            <p class="kt-sub">{p.title}{#if p.scientific}, <i>{p.scientific}</i>{/if}</p>
          </div>
          {@render answers(p.answers, (form) => answerToday({ species: p.slug, text: form }, 'picture'))}
          <form class="kt-form" onsubmit={(e) => { e.preventDefault(); if (name.trim()) void answerToday({ species: p.slug, text: name }, 'picture') }}>
            <label class="sr-only" for="kt-name">Nama {p.title} dalam bahasa {today.language}</label>
            <input id="kt-name" bind:value={name} maxlength="40" autocomplete="off" placeholder="Tulis namanya" />
            <button type="submit" aria-label="Kirim" disabled={!!busy || !name.trim()}><Send size={17} aria-hidden="true" /></button>
          </form>
          <p class="kt-source">{today.publicNames ? 'Nama yang sudah diperiksa tampil di halaman spesies ini, dengan nama komunitas ini.' : 'Komunitas ini tertutup, jadi jawabannya tetap di sini.'}</p>
        </article>
      {/if}
    </div>
  {/if}
  {#if status}<p class="kt-status" role="status">{status}</p>{/if}

  <div class="kt-learn">
    <label class="kt-switch"><Switch checked={kamus.learn} onCheckedChange={(v) => setLearn(v)} /><span><strong>Mode belajar</strong><small>Kata yang sudah diperiksa diberi warna menurut jenisnya.</small></span></label>
    {#if kamus.learn}<ul class="kt-legend" aria-label="Arti warna">
        <li data-c="benda"><span>b</span>Benda</li><li data-c="kerja"><span>k</span>Kerja</li><li data-c="sifat"><span>s</span>Sifat</li><li data-c="lainnya"><span>l</span>Lainnya</li>
      </ul>{/if}
  </div>
</section>

<PeriksaDeck bind:this={deck} {communityId} source="kamus" strip={false} onChanged={() => { refreshAnnotations(); void load() }} />

<style>
  .kamus-top { display: grid; gap: 12px; margin: 0 0 14px; padding: 0 var(--gutter, 24px); --kc-benda: #067132; --kc-kerja: #305eb7; --kc-sifat: #b54d98; --kc-lainnya: #857d0b; }
  :global(.dark) .kamus-top { --kc-benda: #1d7d3e; --kc-kerja: #4777d2; --kc-sifat: #c664a8; --kc-lainnya: #918112; }
  .kt-notice { display: flex; align-items: center; gap: 12px; padding: 14px 14px 14px 16px; border-radius: 16px; background: var(--brand); color: var(--brand-foreground, #fff); }
  .kt-notice p { flex: 1; margin: 0; font-size: 15px; line-height: 1.4; }
  .kt-notice strong { font-weight: 800; }
  .kt-notice button { min-height: 44px; padding: 0 18px; border: 0; border-radius: 12px; background: var(--brand-foreground, #fff); color: var(--brand); font: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer; }
  .kt-notice button:focus-visible { outline: 2px solid var(--brand-foreground, #fff); outline-offset: 2px; }
  .kt-row { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 10px; }
  @media (max-width: 639px) {
    .kamus-top { padding: 0 16px; }
    .kt-row { grid-auto-columns: 86%; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: 16px; margin: 0 -16px; padding: 0 16px 4px; scrollbar-width: none; }
    .kt-row > * { scroll-snap-align: start; }
  }
  .kt-card { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; align-content: start; gap: 10px; padding: 14px; border: 1px solid var(--border); border-radius: 16px; background: color-mix(in oklab, var(--foreground) 2.5%, transparent); }
  .kt-card h3 { margin: 0; font-size: 13.5px; font-weight: 650; color: var(--muted-foreground); }
  .kt-pic h3 { font-size: 16px; font-weight: 700; color: var(--foreground); line-height: 1.3; }
  .kt-ask { margin: 0; font-size: 19px; line-height: 1.3; font-weight: 500; }
  .kt-ask strong { font-weight: 800; }
  .kt-pic { grid-template-columns: 72px minmax(0, 1fr); }
  .kt-pic > :not(.kt-photo):not(.kt-pic-body) { grid-column: 1 / -1; }
  .kt-photo img { display: block; width: 72px; height: 72px; object-fit: cover; border-radius: 14px; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .kt-pic-body { display: grid; align-content: center; gap: 4px; }
  .kt-sub { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .kt-form { display: flex; gap: 6px; }
  .kt-form input { flex: 1; min-width: 0; min-height: 44px; padding: 0 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--background); color: var(--foreground); font: inherit; font-size: 16px; }
  .kt-form button { display: inline-grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; background: var(--foreground); color: var(--background); cursor: pointer; }
  .kt-form button:disabled { opacity: 0.4; cursor: default; }
  .kt-form input:focus-visible, .kt-form button:focus-visible, .kt-answers button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .kt-answers { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
  .kt-answers li { display: flex; align-items: center; gap: 8px; min-height: 40px; font-size: 14.5px; }
  .kt-answer-word { font-weight: 700; }
  .kt-answer-n, .kt-mine { color: var(--muted-foreground); font-size: 13px; font-variant-numeric: tabular-nums; }
  .kt-answers button, .kt-mine { margin-left: auto; }
  .kt-answers button { min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px; background: var(--background); color: var(--foreground); font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  @media (pointer: coarse) { .kt-answers button { min-height: 44px; } }
  .kt-source { margin: 0; font-size: 12.5px; line-height: 1.4; color: var(--muted-foreground); }
  .kt-status { margin: 0; font-size: 14px; }
  .kt-learn { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
  .kt-switch { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .kt-switch span { display: grid; }
  .kt-switch strong { font-size: 14.5px; }
  .kt-switch small { font-size: 13px; color: var(--muted-foreground); }
  .kt-legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .kt-legend li { --kc: var(--muted-foreground); display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 5px; border-radius: 999px; background: color-mix(in oklab, var(--kc) 15%, transparent); font-size: 13px; font-weight: 600; }
  .kt-legend li span { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 999px; background: color-mix(in oklab, var(--kc) 75%, var(--foreground)); color: var(--background); font-size: 11px; font-weight: 800; }
  .kt-legend li[data-c='benda'] { --kc: var(--kc-benda); }
  .kt-legend li[data-c='kerja'] { --kc: var(--kc-kerja); }
  .kt-legend li[data-c='sifat'] { --kc: var(--kc-sifat); }
  .kt-legend li[data-c='lainnya'] { --kc: var(--kc-lainnya); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
