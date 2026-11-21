<script lang="ts">
  // Periksa: a strip at the top of a community page that opens a deck of claims to check. On phones the deck
  // fills the screen; on wider screens it is a dialog over a blurred page. Every swipe has a button and a key.
  import { onMount, tick } from 'svelte'
  import { Dialog } from 'bits-ui'
  import { Check, X, ChevronDown, PencilLine, ListChecks } from '@lucide/svelte'
  import { request } from './api'

  type Claim = { id: string; kind: string; subject: string; statement: string; evidence: { text: string; source?: string }[]; proposer: { name: string; kind: string }; state: string }
  type Queue = { quorum: number; waiting: number; claims: Claim[] }
  let { communityId, onChanged }: { communityId: string; onChanged?: () => void } = $props()

  const KIND: Record<string, string> = { word: 'Kata', sense: 'Arti kata', grammar: 'Tata bahasa', name: 'Nama', place: 'Tempat', date: 'Tanggal', wiki: 'Ensiklopedia', other: 'Lainnya' }
  const MEANING: Record<string, string> = {
    word: 'Pilih Benar jika kata ini memang dipakai di komunitas kamu.',
    sense: 'Pilih Benar jika arti ini sesuai dengan cara kata itu dipakai.',
    grammar: 'Pilih Benar jika aturan ini cocok dengan cara orang berbicara.',
    name: 'Pilih Benar jika nama ini ditulis dan dipakai seperti ini.',
    place: 'Pilih Benar jika keterangan tempat ini sesuai dengan yang kamu tahu.',
    date: 'Pilih Benar jika tanggal atau waktu ini sesuai dengan yang kamu tahu.',
    wiki: 'Pilih Benar jika kalimat ini sesuai dengan sumbernya.',
    other: 'Pilih Benar jika pernyataan ini sesuai dengan yang kamu tahu.',
  }

  let queue = $state<Queue | null>(null),
    open = $state(false),
    index = $state(0),
    answered = $state(0),
    busy = $state(false),
    error = $state(''),
    writing = $state(false),
    own = $state(''),
    dx = $state(0),
    dy = $state(0),
    leaving = $state<'' | 'right' | 'left' | 'up' | 'down'>(''),
    dragging = false,
    start = { x: 0, y: 0 },
    ownField = $state<HTMLTextAreaElement | null>(null)
  const current = $derived(queue?.claims[index] ?? null)
  const total = $derived((queue?.waiting ?? 0))
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

  async function load() {
    try { queue = await request<Queue>('/v1/communities/' + encodeURIComponent(communityId) + '/periksa', undefined, undefined, true) } catch { queue = null }
  }
  function begin() { index = 0; answered = 0; error = ''; writing = false; own = ''; open = true }
  async function finish() { open = false; await load(); if (answered) onChanged?.() }

  async function send(answer: 'yes' | 'no' | 'other' | 'skip') {
    if (!current || busy) return
    if (answer === 'other') { writing = true; await tick(); ownField?.focus(); return }
    busy = true; error = ''
    leaving = answer === 'yes' ? 'right' : answer === 'no' ? 'left' : 'down'
    try {
      if (answer !== 'skip') { await request('/v1/claims/' + current.id + '/answer', { answer }); answered++ }
      await new Promise((r) => setTimeout(r, reduce ? 0 : 180))
      next()
    } catch (e) { error = e instanceof Error ? e.message : 'Jawaban belum terkirim. Coba lagi.'; leaving = '' } finally { busy = false }
  }
  async function sendOwn() {
    if (!current || busy || !own.trim()) return
    busy = true; error = ''; leaving = 'up'
    try {
      await request('/v1/claims/' + current.id + '/answer', { answer: 'other', text: own.trim() })
      answered++
      await new Promise((r) => setTimeout(r, reduce ? 0 : 180))
      next()
    } catch (e) { error = e instanceof Error ? e.message : 'Jawaban belum terkirim. Coba lagi.'; leaving = '' } finally { busy = false }
  }
  function next() { index++; dx = 0; dy = 0; leaving = ''; writing = false; own = '' }

  function down(e: PointerEvent) {
    if (busy || writing || (e.target as HTMLElement).closest('button,textarea,a')) return
    dragging = true; start = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) { if (dragging) { dx = e.clientX - start.x; dy = Math.min(0, e.clientY - start.y) } }
  function up() {
    if (!dragging) return
    dragging = false
    if (dx > 96) void send('yes')
    else if (dx < -96) void send('no')
    else { dx = 0; dy = 0 }
  }
  function keys(e: KeyboardEvent) {
    if (!current || (e.target as HTMLElement).closest('textarea')) return
    const map: Record<string, 'yes' | 'no' | 'other' | 'skip'> = { ArrowRight: 'yes', ArrowLeft: 'no', ArrowUp: 'other', ArrowDown: 'skip' }
    const a = map[e.key]
    if (a) { e.preventDefault(); void send(a) }
  }
  const lean = $derived(dx > 40 ? 'yes' : dx < -40 ? 'no' : '')
  onMount(load)
</script>

{#if queue && queue.waiting > 0}<div class="periksa-strip">
    <ListChecks size={18} aria-hidden="true" />
    <p><strong>{queue.waiting}</strong> hal menunggu diperiksa oleh anggota.</p>
    <button type="button" onclick={begin}>Periksa</button>
  </div>{/if}

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) void finish() }}>
  <Dialog.Portal>
    <Dialog.Overlay class="periksa-overlay" />
    <Dialog.Content class="periksa-deck" onkeydown={keys} aria-describedby="periksa-help">
      <header class="pk-head">
        <Dialog.Title class="pk-title">Periksa</Dialog.Title>
        {#if current}<span class="pk-count" aria-live="polite">{index + 1} dari {Math.min(total, queue?.claims.length ?? 0)}</span>{/if}
        <Dialog.Close class="pk-close" aria-label="Tutup"><X size={18} /></Dialog.Close>
      </header>

      {#if current}
        <article
          class="pk-card"
          class:lean-yes={lean === 'yes'}
          class:lean-no={lean === 'no'}
          class:leaving
          data-leaving={leaving}
          style:--dx={dx + 'px'}
          style:--dy={dy + 'px'}
          style:--rot={dx / 28 + 'deg'}
          onpointerdown={down}
          onpointermove={move}
          onpointerup={up}
          onpointercancel={up}
        >
          <span class="pk-kind">{KIND[current.kind] ?? 'Lainnya'}</span>
          <h3 class="pk-subject">{current.subject}</h3>
          <p class="pk-statement">{current.statement}</p>
          {#if current.evidence.length}<ul class="pk-evidence">
              {#each current.evidence as e}<li><span>{e.text}</span>{#if e.source}<small>{e.source}</small>{/if}</li>{/each}
            </ul>{/if}
          <p class="pk-by">Diusulkan oleh {current.proposer.name}{current.proposer.kind === 'agent' ? ' (AI)' : ''}.</p>
          {#if writing}<form class="pk-own" onsubmit={(e) => { e.preventDefault(); void sendOwn() }}>
              <label for="pk-own">Tulis versi yang menurut kamu benar.</label>
              <textarea id="pk-own" bind:this={ownField} bind:value={own} rows="3" maxlength="500"></textarea>
              <div class="pk-own-actions"><button type="button" onclick={() => { writing = false; own = '' }}>Batal</button><button type="submit" class="pk-primary" disabled={busy || !own.trim()}>Kirim</button></div>
            </form>{/if}
        </article>
        <p id="periksa-help" class="pk-help">{MEANING[current.kind] ?? MEANING.other} Geser ke kanan untuk Benar dan ke kiri untuk Salah.</p>
        {#if error}<p class="pk-error" role="alert">{error}</p>{/if}
        {#if !writing}<div class="pk-actions">
            <button type="button" class="pk-no" onclick={() => send('no')} disabled={busy} aria-keyshortcuts="ArrowLeft"><X size={20} /><span>Salah</span></button>
            <button type="button" onclick={() => send('skip')} disabled={busy} aria-keyshortcuts="ArrowDown"><ChevronDown size={20} /><span>Lewati</span></button>
            <button type="button" onclick={() => send('other')} disabled={busy} aria-keyshortcuts="ArrowUp"><PencilLine size={20} /><span>Jawaban lain</span></button>
            <button type="button" class="pk-yes" onclick={() => send('yes')} disabled={busy} aria-keyshortcuts="ArrowRight"><Check size={20} /><span>Benar</span></button>
          </div>{/if}
      {:else}
        <div class="pk-done">
          <h3>{answered ? 'Terima kasih, semua kartu sudah kamu periksa.' : 'Tidak ada kartu untuk kamu saat ini.'}</h3>
          <p id="periksa-help">Sebuah pernyataan dianggap benar setelah {queue?.quorum ?? 2} anggota setuju. Kartu baru akan muncul di sini.</p>
          <Dialog.Close class="pk-primary">Selesai</Dialog.Close>
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .periksa-strip { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; padding: 10px 12px 10px 14px; border: 1px solid var(--border); border-radius: 14px; background: color-mix(in oklab, var(--brand) 7%, var(--background)); color: var(--foreground); }
  .periksa-strip p { flex: 1; margin: 0; font-size: 14px; line-height: 1.4; }
  .periksa-strip button, :global(.pk-primary) { min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: var(--brand); color: var(--brand-foreground, #fff); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  :global(.pk-primary:disabled) { opacity: 0.55; cursor: default; }
  .periksa-strip button:focus-visible, :global(.pk-primary:focus-visible) { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  :global(.periksa-overlay) { position: fixed; inset: 0; z-index: 50; background: color-mix(in oklab, var(--background) 45%, transparent); backdrop-filter: blur(10px) saturate(0.9); -webkit-backdrop-filter: blur(10px) saturate(0.9); }
  :global(.periksa-deck) { position: fixed; inset: 0; z-index: 51; display: flex; flex-direction: column; gap: 14px; padding: max(14px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)); background: var(--background); color: var(--foreground); outline: none; overflow-y: auto; }
  @media (min-width: 640px) {
    :global(.periksa-deck) { inset: auto; top: 50%; left: 50%; width: min(480px, calc(100vw - 32px)); max-height: calc(100dvh - 48px); transform: translate(-50%, -50%); padding: 18px; border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 24px 60px -20px rgb(0 0 0 / 0.35); }
  }
  .pk-head { display: flex; align-items: center; gap: 10px; }
  :global(.pk-title) { margin: 0; font-size: 17px; font-weight: 650; }
  .pk-count { margin-left: auto; font-size: 13px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  :global(.pk-close) { display: inline-grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent; color: var(--foreground); cursor: pointer; }
  .pk-card { position: relative; display: grid; gap: 10px; padding: 20px 18px; border: 1px solid var(--border); border-radius: 18px; background: var(--card, var(--background)); box-shadow: 0 10px 30px -18px rgb(0 0 0 / 0.3); touch-action: pan-y; user-select: none; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s, border-color 0.2s; cursor: grab; }
  .pk-card:active { cursor: grabbing; transition: none; }
  .pk-card.lean-yes { border-color: color-mix(in oklab, var(--success, #2f7d4f) 60%, var(--border)); }
  .pk-card.lean-no { border-color: color-mix(in oklab, var(--destructive, #b3261e) 60%, var(--border)); }
  .pk-card[data-leaving='right'] { transform: translate(120%, 0) rotate(8deg); opacity: 0; }
  .pk-card[data-leaving='left'] { transform: translate(-120%, 0) rotate(-8deg); opacity: 0; }
  .pk-card[data-leaving='up'] { transform: translate(0, -40%); opacity: 0; }
  .pk-card[data-leaving='down'] { transform: translate(0, 30%); opacity: 0; }
  .pk-kind { justify-self: start; padding: 2px 8px; border-radius: 999px; background: color-mix(in oklab, var(--brand) 12%, transparent); font-size: 12.5px; font-weight: 600; }
  .pk-subject { margin: 0; font-size: clamp(26px, 7vw, 34px); font-weight: 700; line-height: 1.1; letter-spacing: -0.01em; overflow-wrap: anywhere; }
  .pk-statement { margin: 0; font-size: 17px; line-height: 1.5; }
  .pk-evidence { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .pk-evidence li { display: grid; gap: 2px; padding: 8px 10px; border-radius: 10px; background: color-mix(in oklab, var(--foreground) 5%, transparent); font-size: 15px; line-height: 1.45; }
  .pk-evidence small, .pk-by, .pk-help, .pk-count { color: var(--muted-foreground); }
  .pk-evidence small { font-size: 12.5px; }
  .pk-by { margin: 0; font-size: 13px; }
  .pk-help { margin: 0; font-size: 13.5px; line-height: 1.45; }
  .pk-error { margin: 0; font-size: 14px; color: var(--destructive, #b3261e); }
  .pk-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: auto; }
  .pk-actions button { display: grid; justify-items: center; gap: 4px; min-height: 64px; padding: 8px 4px; border: 1px solid var(--border); border-radius: 14px; background: var(--background); color: var(--foreground); font: inherit; font-size: 13px; font-weight: 550; cursor: pointer; }
  .pk-actions button:hover:not(:disabled) { background: color-mix(in oklab, var(--foreground) 5%, var(--background)); }
  .pk-actions button:focus-visible, .pk-own button:focus-visible, :global(.pk-close:focus-visible) { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; }
  .pk-actions button:disabled { opacity: 0.55; cursor: default; }
  .pk-actions .pk-yes { border-color: color-mix(in oklab, var(--success, #2f7d4f) 55%, var(--border)); color: var(--success, #2f7d4f); }
  .pk-actions .pk-no { border-color: color-mix(in oklab, var(--destructive, #b3261e) 55%, var(--border)); color: var(--destructive, #b3261e); }
  .pk-own { display: grid; gap: 8px; }
  .pk-own label { font-size: 14px; font-weight: 600; }
  .pk-own textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 16px; resize: vertical; }
  .pk-own-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .pk-own-actions button:not(.pk-primary) { min-height: 40px; padding: 0 14px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; cursor: pointer; }
  .pk-done { display: grid; gap: 10px; justify-items: start; margin: auto 0; }
  .pk-done h3 { margin: 0; font-size: 20px; line-height: 1.3; }
  .pk-done p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--muted-foreground); }
  @media (prefers-reduced-motion: reduce) { .pk-card { transition: none; transform: none; } }
</style>
