<script lang="ts">
  // The word card: one solid card in the accent colour that opens on any word of a post in a Kamus community. It asks
  // the open question about the word (Ya, Bukan, Tidak tahu), takes a word class, written meaning, and voice
  // pronunciation, and saves the word to Kata saya. One answer never decides anything.
  import { Dialog } from 'bits-ui'
  import { X, Check, Bookmark, BookmarkCheck, PencilLine, Mic } from '@lucide/svelte'
  import { request, type VoiceAttachment } from './api'
  import { kamus, closeWord, refreshAnnotations } from './kamus-posts.svelte.ts'
  import { WORD_CLASSES, type WordClass } from './kamus-text.ts'
  import VoicePlayer from './VoicePlayer.svelte'
  import VoiceRecorder from './VoiceRecorder.svelte'
  import { uploadVoiceDraft, type VoiceDraft } from './voice'

  type Claim = { id: string; state: string; yes: number; no: number; mine: string | null; proposedByMe: boolean }
  type Sense = { id: string; lemma: string; gloss: string; pos: string; dialect: string; variants: { form: string; dialect: string }[]; source: string; licence: string; page: number | null; state: string }
  type Word = {
    form: string; norm: string; language: string; quorum: number; state: 'checked' | 'question' | 'known' | 'new'
    question: { key: string; kind: 'entry' | 'stem' | 'align' | 'frequent'; text: string; gloss: string; stem: string; suffix: string; wordClass: WordClass | ''; source: string; licence: string; claim: Claim | null; answered: boolean } | null
    senses: Sense[]; stem: { stem: string; suffix: string; senses: Sense[] } | null
    wordClass: WordClass | null; classVotes: Record<WordClass, number>; myClass: WordClass | null
    aligned: { indonesian: string; wordClass: string; together: number } | null
    uses: { uses: number; speakers: number } | null
    mine: { saved: boolean; gloss: string; wordClass: string } | null
    voices?: VoiceAttachment[]
    canAnswer: boolean
  }
  const CLASS: Record<WordClass, string> = { benda: 'Benda', kerja: 'Kerja', sifat: 'Sifat', lainnya: 'Lainnya' }
  const CLASS_LONG: Record<string, string> = { benda: 'kata benda', kerja: 'kata kerja', sifat: 'kata sifat', lainnya: 'jenis lainnya' }

  let word = $state<Word | null>(null),
    failed = $state(''),
    busy = $state(''),
    writing = $state(false),
    recordingVoice = $state(false),
    voiceDraft = $state<VoiceDraft | null>(null),
    meaning = $state(''),
    note = $state(''),
    narrow = $state(false),
    field = $state<HTMLInputElement | null>(null)
  const card = $derived(kamus.card)
  const base = $derived(card ? '/v1/communities/' + encodeURIComponent(card.communityId) + '/kamus' : '')

  $effect(() => {
    const c = kamus.card
    word = null; failed = ''; writing = false; recordingVoice = false; voiceDraft = null; meaning = ''; note = ''
    if (!c) return
    narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 639px)').matches
    const p = new URLSearchParams({ w: c.form }); if (c.postId) p.set('post', c.postId)
    request<Word>('/v1/communities/' + encodeURIComponent(c.communityId) + '/kamus/word?' + p, undefined, undefined, true)
      .then((w) => {
        if (kamus.card !== c) return
        word = w
        // Kata saya keeps what a member tapped; failure here changes nothing on the card.
        if (w.canAnswer) request('/v1/communities/' + encodeURIComponent(c.communityId) + '/kamus/mine', { form: w.form, postId: c.postId }, undefined, true).catch(() => {})
      })
      .catch((e) => { if (kamus.card === c) failed = e instanceof Error ? e.message : 'Kata ini belum bisa dimuat.' })
  })

  const position = $derived.by(() => {
    const r = card?.anchor
    if (!r || narrow || typeof window === 'undefined') return ''
    const w = 360, left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2))
    const below = window.innerHeight - r.bottom > 380 || r.top < 380
    return below ? `left:${left}px;top:${Math.round(r.bottom + 10)}px` : `left:${left}px;bottom:${Math.round(window.innerHeight - r.top + 10)}px`
  })

  async function send(body: Record<string, unknown>, label: string) {
    if (!card || !word || busy) return
    busy = label; note = ''
    try {
      const r = await request<{ word: Word }>(base + '/answer', { form: word.form, postId: card.postId, ...body })
      word = r.word
      refreshAnnotations()
      return true
    } catch (e) { note = e instanceof Error ? e.message : 'Jawaban belum terkirim. Coba lagi.'; return false } finally { busy = '' }
  }
  async function answer(a: 'yes' | 'no' | 'skip') {
    if (!word?.question) return
    const ok = await send({ key: word.question.key, answer: a }, a)
    if (ok) note = a === 'skip' ? 'Pertanyaan ini tidak ditanyakan lagi kepada kamu.' : 'Jawaban kamu tercatat.'
  }
  async function setClass(c: WordClass) { if (await send({ wordClass: c }, 'class')) note = 'Jenis kata tercatat.' }
  async function writeMeaning() {
    if (!word || !meaning.trim()) return
    const key = word.question && word.question.kind !== 'frequent' ? word.question.key : 'new:' + word.norm
    if (await send({ key, answer: 'other', text: meaning.trim() }, 'meaning')) { writing = false; meaning = ''; note = 'Arti kamu menjadi usulan. Anggota lain akan memeriksanya.' }
  }
  async function saveVoice() {
    if (!card || !word || !voiceDraft || busy) return
    busy = 'voice'; note = ''
    try {
      const uploaded = await uploadVoiceDraft(card.communityId, voiceDraft)
      const attached = await request<VoiceAttachment>(base + '/voice', { word: word.form, clipId: uploaded.id })
      word.voices = [attached, ...(word.voices ?? [])]
      URL.revokeObjectURL(voiceDraft.previewUrl)
      voiceDraft = null
      recordingVoice = false
      note = 'Pelafalan kamu tersimpan untuk kata ini.'
    } catch (e) {
      note = e instanceof Error ? e.message : 'Rekaman pelafalan belum tersimpan.'
    } finally { busy = '' }
  }
  async function toggleSave() {
    if (!card || !word || busy) return
    busy = 'save'
    try {
      const saved = !word.mine?.saved
      await request(base + '/mine', { form: word.form, postId: card.postId, saved })
      word.mine = { saved, gloss: word.mine?.gloss ?? '', wordClass: word.mine?.wordClass ?? '' }
      note = saved ? 'Disimpan ke Kata saya.' : 'Dihapus dari simpanan Kata saya.'
    } catch (e) { note = e instanceof Error ? e.message : 'Belum tersimpan.' } finally { busy = '' }
  }
  async function startWriting() { writing = true; await Promise.resolve(); field?.focus() }
  const sourceLine = (s: { source: string; licence: string; page?: number | null }) => [s.source + (s.page ? ', hlm. ' + s.page : ''), s.licence].filter(Boolean).join(', ')
  const checkedSense = $derived(word?.senses.find((s) => s.state === 'checked') ?? word?.stem?.senses.find((s) => s.state === 'checked') ?? null)
  const q = $derived(word?.question ?? null)
  const progress = $derived(q?.claim ? `${q.claim.yes} dari ${word?.quorum ?? 2} anggota menjawab ya` : '')
</script>

<Dialog.Root open={!!card} onOpenChange={(v) => { if (!v) closeWord() }}>
  <Dialog.Portal>
    <Dialog.Overlay class="kw-overlay" />
    <Dialog.Content class={'kw-card' + (narrow ? ' kw-sheet' : '')} style={position} aria-describedby="kw-question" onCloseAutoFocus={(e) => e.preventDefault()}>
      <header class="kw-head">
        <div>
          <Dialog.Title class="kw-word">{word?.form ?? card?.form ?? ''}</Dialog.Title>
          {#if word?.language}<p class="kw-lang">Bahasa {word.language}</p>{/if}
        </div>
        <Dialog.Close class="kw-close" aria-label="Tutup"><X size={18} /></Dialog.Close>
      </header>

      {#if failed}
        <p id="kw-question" class="kw-q" role="alert">{failed}</p>
      {:else if !word}
        <p id="kw-question" class="kw-q kw-loading" role="status">Memuat kata…</p>
      {:else}
        {#if word.voices?.length}
          <div class="kw-voices">
            {#each word.voices.slice(0, 3) as clip (clip.id)}
              <VoicePlayer {clip} compact={true} />
            {/each}
          </div>
        {/if}
        {#if word.state === 'checked' && checkedSense}
          <p id="kw-question" class="kw-q">Artinya <strong>{checkedSense.gloss}</strong>.</p>
          <p class="kw-sub">{word.stem && !word.senses.length ? `Bentuk dari ${word.stem.stem}. ` : ''}Sudah diperiksa anggota{word.wordClass ? `, ${CLASS_LONG[word.wordClass]}` : ''}.</p>
        {:else if q}
          {#if q.kind === 'frequent'}
            <p id="kw-question" class="kw-q">Kata ini belum ada di kamus.</p>
            <p class="kw-sub">{word.uses ? `Dipakai ${word.uses.uses} kali oleh ${word.uses.speakers} orang di sini. ` : ''}Tulis artinya jika kamu tahu.</p>
          {:else if q.kind === 'stem'}
            <p id="kw-question" class="kw-q">Bentuk dari <strong>{q.stem}</strong>?</p>
            <p class="kw-sub">{q.stem} artinya {q.gloss}. Akhiran -{q.suffix}.</p>
          {:else}
            <p id="kw-question" class="kw-q">Artinya <strong>{q.gloss}</strong>?{#if q.kind === 'align' && q.wordClass} <span class="kw-guess">({CLASS_LONG[q.wordClass]})</span>{/if}</p>
            {#if q.kind === 'align'}<p class="kw-sub">Tebakan ini dihitung dari {word.aligned?.together ?? 2} posting yang punya terjemahan.</p>{/if}
          {/if}
          {#if word.canAnswer && q.kind !== 'frequent'}
            {#if q.claim?.proposedByMe}<p class="kw-sub">Kamu mengusulkan arti ini. Anggota lain yang memeriksanya.</p>
            {:else}<div class="kw-answers" role="group" aria-label="Jawaban">
                <button type="button" class="kw-yes" aria-pressed={q.claim?.mine === 'yes'} disabled={!!busy} onclick={() => answer('yes')}><Check size={17} aria-hidden="true" />Ya</button>
                <button type="button" aria-pressed={q.claim?.mine === 'no'} disabled={!!busy} onclick={() => answer('no')}><X size={17} aria-hidden="true" />Bukan</button>
                <button type="button" disabled={!!busy} onclick={() => answer('skip')}>Tidak tahu</button>
              </div>{/if}
            {#if progress}<p class="kw-sub">{progress}.</p>{/if}
          {/if}
        {:else if word.senses.length || word.stem}
          {@const s = word.senses[0] ?? word.stem!.senses[0]}
          <p id="kw-question" class="kw-q">{#if s}Arti dari sumber: <strong>{s.gloss}</strong>.{:else}Kata ini belum ada di kamus.{/if}</p>
          <p class="kw-sub">{word.senses.some((x) => x.state === 'rejected') ? 'Anggota menjawab bahwa arti ini tidak cocok.' : 'Belum diperiksa anggota.'}</p>
        {:else}
          <p id="kw-question" class="kw-q">Kata ini belum ada di kamus.</p>
          {#if word.canAnswer}<p class="kw-sub">Tulis artinya jika kamu tahu. Anggota lain akan memeriksanya.</p>{/if}
        {/if}

        {#if word.canAnswer}
          <fieldset class="kw-classes">
            <legend>Jenis kata</legend>
            {#each WORD_CLASSES as c (c)}<button type="button" class="kw-chip" aria-pressed={word.myClass === c} disabled={!!busy} onclick={() => setClass(c)}>{CLASS[c]}{#if word.classVotes[c]}<span class="kw-n">{word.classVotes[c]}</span>{/if}</button>{/each}
          </fieldset>
          {#if writing}
            <form class="kw-write" onsubmit={(e) => { e.preventDefault(); void writeMeaning() }}>
              <label for="kw-meaning">Arti dalam bahasa Indonesia</label>
              <div><input id="kw-meaning" bind:this={field} bind:value={meaning} maxlength="160" autocomplete="off" /><button type="submit" class="kw-send" disabled={!!busy || !meaning.trim()}>Kirim</button></div>
            </form>
          {/if}
          {#if recordingVoice}
            <div class="kw-voice-box">
              <VoiceRecorder bind:draft={voiceDraft} compact={true} allowProtocol={false} onError={(m) => (note = m)} />
              {#if voiceDraft}
                <button type="button" class="kw-send" disabled={!!busy} onclick={saveVoice}>
                  {busy === 'voice' ? 'Mengunggah...' : 'Simpan pelafalan'}
                </button>
              {/if}
            </div>
          {/if}
          <div class="kw-tools">
            {#if !writing}<button type="button" onclick={startWriting}><PencilLine size={16} aria-hidden="true" />Tulis arti</button>{/if}
            <button type="button" aria-pressed={recordingVoice} onclick={() => (recordingVoice = !recordingVoice)}><Mic size={16} aria-hidden="true" />Ucapkan</button>
            <button type="button" aria-pressed={!!word.mine?.saved} disabled={busy === 'save'} onclick={toggleSave}>{#if word.mine?.saved}<BookmarkCheck size={16} aria-hidden="true" />Tersimpan{:else}<Bookmark size={16} aria-hidden="true" />Simpan{/if}</button>
          </div>
        {:else}
          <p class="kw-sub">Bergabunglah dengan komunitas ini untuk menjawab dan menyimpan kata.</p>
        {/if}
        {#if note}<p class="kw-note" role="status">{note}</p>{/if}
        {#if (q && q.source) || checkedSense}
          <p class="kw-source">{q && q.source ? sourceLine({ source: q.source, licence: q.licence, page: word.senses.find((x) => q.gloss === x.gloss)?.page }) : sourceLine(checkedSense!)}</p>
        {/if}
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  :global(.kw-overlay) { position: fixed; inset: 0; z-index: 60; background: transparent; }
  :global(.kw-card) {
    position: fixed; z-index: 61; width: 360px; max-height: min(78dvh, 560px); overflow-y: auto;
    display: grid; gap: 10px; padding: 16px 16px 14px;
    border-radius: 16px; background: var(--brand); color: var(--brand-foreground, #fff);
    box-shadow: 0 18px 40px -16px rgb(0 0 0 / 0.45); outline: none;
    animation: kw-in 160ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  :global(.kw-card.kw-sheet) { left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom)); width: auto; }
  @keyframes kw-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { :global(.kw-card) { animation: none; } }
  .kw-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  :global(.kw-word) { margin: 0; font-size: 26px; font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; overflow-wrap: anywhere; }
  .kw-lang { margin: 2px 0 0; font-size: 13px; opacity: 0.82; }
  :global(.kw-close) { display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; margin: -8px -8px 0 0; border: 0; border-radius: 12px; background: transparent; color: inherit; cursor: pointer; }
  :global(.kw-close:hover) { background: color-mix(in oklab, currentColor 12%, transparent); }
  .kw-q { margin: 0; font-size: 18px; line-height: 1.4; font-weight: 500; }
  .kw-q strong { font-weight: 800; }
  .kw-loading { opacity: 0.85; }
  .kw-guess { font-size: 15px; font-weight: 500; opacity: 0.88; }
  .kw-sub, .kw-note { margin: 0; font-size: 14px; line-height: 1.45; opacity: 0.9; }
  .kw-note { font-weight: 600; opacity: 1; }
  .kw-answers { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 8px; }
  .kw-answers button, .kw-tools button, .kw-chip, .kw-send {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 12px;
    border: 1px solid color-mix(in oklab, currentColor 38%, transparent); border-radius: 12px; background: transparent; color: inherit;
    font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer;
  }
  .kw-answers button:hover:not(:disabled), .kw-tools button:hover:not(:disabled), .kw-chip:hover:not(:disabled) { background: color-mix(in oklab, currentColor 12%, transparent); }
  .kw-answers .kw-yes, .kw-send { background: var(--brand-foreground, #fff); color: var(--brand); border-color: transparent; }
  .kw-answers .kw-yes:hover:not(:disabled) { background: color-mix(in oklab, var(--brand-foreground, #fff) 88%, var(--brand)); }
  .kw-answers button[aria-pressed='true'] { box-shadow: inset 0 0 0 2px currentColor; }
  .kw-answers .kw-yes[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--brand), 0 0 0 4px var(--brand-foreground, #fff); }
  button:disabled { opacity: 0.6; cursor: default; }
  button:focus-visible, input:focus-visible { outline: 2px solid var(--brand-foreground, #fff); outline-offset: 2px; }
  .kw-classes { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 0; padding: 0; border: 0; }
  .kw-classes legend { width: 100%; margin-bottom: 6px; padding: 0; font-size: 13px; font-weight: 600; opacity: 0.88; }
  .kw-chip { min-height: 44px; padding: 0 14px; border-radius: 999px; font-size: 14px; }
  .kw-chip[aria-pressed='true'] { background: var(--brand-foreground, #fff); color: var(--brand); border-color: transparent; }
  .kw-n { min-width: 18px; padding: 0 5px; border-radius: 999px; background: color-mix(in oklab, currentColor 18%, transparent); font-size: 12px; font-variant-numeric: tabular-nums; }
  .kw-write { display: grid; gap: 6px; }
  .kw-write label { font-size: 13px; font-weight: 600; opacity: 0.9; }
  .kw-write div { display: flex; gap: 6px; }
  .kw-write input { flex: 1; min-width: 0; min-height: 44px; padding: 0 12px; border: 0; border-radius: 12px; background: var(--brand-foreground, #fff); color: #171717; font: inherit; font-size: 16px; }
  .kw-tools { display: flex; flex-wrap: wrap; gap: 8px; }
  .kw-tools button { flex: 1 1 auto; justify-content: flex-start; border-color: transparent; background: color-mix(in oklab, currentColor 10%, transparent); }
  .kw-tools button[aria-pressed='true'] { background: color-mix(in oklab, currentColor 20%, transparent); }
  .kw-voices, .kw-voice-box { display: grid; gap: 6px; color: var(--ink); }
  .kw-source { margin: 2px 0 0; padding-top: 8px; border-top: 1px solid color-mix(in oklab, currentColor 22%, transparent); font-size: 12.5px; line-height: 1.4; opacity: 0.85; }
</style>
