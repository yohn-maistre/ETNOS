<script lang="ts">
  // One switch for Aksara across every public community the operator looks after. On sets Aksara up where it is
  // new (30-day permissions that renew while it stays on, questions through @aksara, the daily schedule) and wakes
  // a paused one; off pauses it everywhere. Each community shows what Aksara did today and anything that stopped it.
  import { onMount } from 'svelte'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import { Eye, EyeOff, ClipboardPaste, ArrowUpRight } from '@lucide/svelte'
  import { request } from './api'

  type Room = { id: string; title: string; configured: boolean; enabled: boolean; ready: boolean; reason: string | null; expires: number | null; mine: boolean; jobsToday: number; dailyLimit: number | null }
  type Overview = { budget: { modelCalls: number }; provider: string | null; model: { keyless: string | null; keyed: { host: string; fast: string } | null } | null; communities: Room[] }
  let { onChanged }: { onChanged?: () => void } = $props()
  let view = $state<Overview | null>(null),
    busy = $state(false),
    error = $state(''),
    skipped = $state<{ title: string; reason?: string }[]>([])
  const on = $derived(!!view?.communities.some((c) => c.enabled && c.mine))
  const date = (t: number) => new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

  // The model list comes from the provider itself; only the node operator can read or change it.
  type Models = { route: { keyless: string | null; keyed: { host: string; fast: string; synthesis: string } | null }; choice: { fast: string; synthesis?: string } | null; key: { source: 'studio' | 'github'; last4: string | null; added: number | null } | null; available: string[] | null }
  let models = $state<Models | null>(null),
    fast = $state(''),
    synthesis = $state(''),
    savedNote = $state('')
  // The key field: hidden by default, never autofilled or spellchecked, trimmed on paste, checked with the
  // provider before it is kept. The browser never receives the saved key back; only its last four characters.
  let keyInput = $state(''),
    showKey = $state(false),
    baseUrl = $state(''),
    editingKey = $state(false),
    keyNote = $state('')
  const keyShape = $derived(keyInput.trim() && !baseUrl && !/^AIza[\w-]{30,}$/.test(keyInput.trim()) ? 'Kunci Google AI Studio biasanya diawali “AIza” dan sekitar 39 karakter.' : '')
  async function pasteKey() {
    try { keyInput = (await navigator.clipboard.readText()).trim() } catch { keyNote = 'Peramban tidak mengizinkan menempel otomatis. Tempel manual dengan Ctrl+V.' }
  }
  async function saveKey() {
    if (busy || !keyInput.trim()) return
    busy = true
    error = ''
    keyNote = ''
    try {
      const r = await request<{ last4: string; choice: { fast: string } | null; available: number }>('/v1/ops/model-key', { key: keyInput.trim(), ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}) })
      keyInput = ''
      showKey = false
      editingKey = false
      await load()
      keyNote = 'Kunci diterima. ' + r.available + ' model tersedia' + (r.choice ? ', model awal ' + r.choice.fast + '.' : '.')
    } catch (e) { error = e instanceof Error ? e.message : 'Kunci belum tersimpan.' } finally { busy = false }
  }
  async function removeKey() {
    if (busy || !confirm('Hapus kunci model dari Studio? Aksara kembali ke kunci GitHub atau ke Workers AI tanpa kunci.')) return
    busy = true
    try { await request('/v1/ops/model-key', { remove: true }); await load(); keyNote = 'Kunci dihapus.' } catch (e) { error = e instanceof Error ? e.message : 'Kunci belum terhapus.' } finally { busy = false }
  }
  async function load() {
    try { view = await request<Overview>('/v1/resident/overview') } catch (e) { error = e instanceof Error ? e.message : 'Status Aksara belum dapat dimuat.' }
    try {
      models = await request<Models>('/v1/ops/models', undefined, undefined, true)
      fast = models.route.keyed?.fast ?? ''
      synthesis = models.route.keyed && models.route.keyed.synthesis !== models.route.keyed.fast ? models.route.keyed.synthesis : ''
    } catch { models = null }
  }
  async function saveModel() {
    if (busy || !fast) return
    busy = true
    error = ''
    savedNote = ''
    try {
      await request('/v1/ops/model', { fast, synthesis: synthesis || undefined })
      await load()
      savedNote = 'Model disimpan. Tugas berikutnya memakai model ini.'
    } catch (e) { error = e instanceof Error ? e.message : 'Model belum tersimpan.' } finally { busy = false }
  }
  onMount(load)
  async function toggle(next: boolean) {
    if (busy) return
    busy = true
    error = ''
    try {
      const r = await request<{ results: { title: string; state: string; reason?: string }[] }>('/v1/resident/all', { enabled: next, requestKey: crypto.randomUUID() })
      skipped = r.results.filter((x) => x.state === 'dilewati')
      await load()
      onChanged?.()
    } catch (e) { error = e instanceof Error ? e.message : 'Belum dapat diubah.' } finally { busy = false }
  }
</script>

{#if view}
  <section class="aksara-switch" aria-label="Aksara">
    <div class="as-head">
      <div>
        <h2>Aksara</h2>
        <p>{on ? 'Aktif. Aksara bekerja sendiri sesuai jadwal dan menjawab saat disebut.' : 'Dijeda. Aksara tidak membuat tugas baru.'}</p>
      </div>
      <Switch checked={on} disabled={busy || !view.communities.length} onCheckedChange={(v) => toggle(v)} aria-label={on ? 'Jeda Aksara' : 'Aktifkan Aksara'} />
    </div>
    <dl class="as-facts">
      <div><dt>Model</dt><dd>{models?.route.keyed ? models.route.keyed.fast + ' · ' + models.route.keyed.host : view.model?.keyed ? view.model.keyed.fast + ' · ' + view.model.keyed.host : (view.model?.keyless ?? 'Belum ada model') + ' · tanpa kunci'}</dd></div>
      <div><dt>Batas harian</dt><dd>{view.budget.modelCalls} panggilan model untuk seluruh situs</dd></div>
    </dl>
    {#if models?.route.keyed && models.available?.length}<form class="as-model" onsubmit={(e) => { e.preventDefault(); void saveModel() }}>
        <label>Model untuk tugas biasa
          <select bind:value={fast}>{#each models.available as m (m)}<option value={m}>{m}</option>{/each}</select>
        </label>
        <label>Model untuk tulisan panjang
          <select bind:value={synthesis}><option value="">Sama dengan di atas</option>{#each models.available as m (m)}<option value={m}>{m}</option>{/each}</select>
        </label>
        <button type="submit" class="as-save" disabled={busy || !fast}>Simpan model</button>
        <small>{models.available.length} model dari {models.route.keyed.host}.{savedNote ? ' ' + savedNote : ''}</small>
      </form>{:else if models?.route.keyed && !models.available}<p class="as-note">Daftar model dari penyedia belum dapat dimuat. Periksa kuncinya.</p>{/if}
    {#if models}<div class="as-key">
        {#if models.key && !editingKey}<div class="as-key-row">
            <div><span class="as-key-label">Kunci model</span><span class="as-key-value">{models.key.source === 'studio' ? '••••' + models.key.last4 + (models.key.added ? ' · ditambahkan ' + date(models.key.added) : '') : 'Dari GitHub (STRATA_MODEL_KEY)'}</span></div>
            <div class="as-key-actions"><button type="button" onclick={() => (editingKey = true)}>Ganti</button>{#if models.key.source === 'studio'}<button type="button" onclick={removeKey} disabled={busy}>Hapus</button>{/if}</div>
          </div>{:else}<form class="as-key-form" autocomplete="off" onsubmit={(e) => { e.preventDefault(); void saveKey() }}>
            <label for="aksara-key">Kunci model</label>
            <p class="as-note">{models.key ? 'Kunci baru menggantikan yang lama setelah diperiksa.' : 'Tanpa kunci, Aksara memakai ' + (models.route.keyless ?? 'Workers AI') + ' dengan batas kecil.'} <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Buat kunci di Google AI Studio<ArrowUpRight size={12} /></a></p>
            <div class="as-key-field">
              <input id="aksara-key" type={showKey ? 'text' : 'password'} bind:value={keyInput} placeholder="AIza…" autocomplete="off" autocapitalize="off" spellcheck="false" data-1p-ignore data-lpignore="true" onpaste={(e) => { e.preventDefault(); keyInput = (e.clipboardData?.getData('text') ?? '').trim() }} aria-describedby="aksara-key-hint" />
              <button type="button" onclick={() => (showKey = !showKey)} aria-label={showKey ? 'Sembunyikan kunci' : 'Tampilkan kunci'} aria-pressed={showKey}>{#if showKey}<EyeOff size={16} />{:else}<Eye size={16} />{/if}</button>
              <button type="button" onclick={pasteKey} aria-label="Tempel dari papan klip"><ClipboardPaste size={16} /></button>
            </div>
            <small id="aksara-key-hint">{keyShape || 'Kunci diperiksa ke penyedia, lalu disimpan di node ini dan tidak ditampilkan lagi.'}</small>
            <details class="as-provider"><summary>Penyedia lain</summary><label>Alamat API yang kompatibel dengan OpenAI<input type="url" bind:value={baseUrl} placeholder="https://generativelanguage.googleapis.com/v1beta/openai" autocomplete="off" spellcheck="false" /></label></details>
            <div class="as-key-actions"><button type="submit" class="as-save" disabled={busy || keyInput.trim().length < 10}>{busy ? 'Memeriksa…' : 'Periksa & simpan'}</button>{#if editingKey}<button type="button" onclick={() => { editingKey = false; keyInput = '' }}>Batal</button>{/if}</div>
          </form>{/if}
        {#if keyNote}<p class="as-note" role="status">{keyNote}</p>{/if}
      </div>{/if}
    {#if view.communities.length}<ul class="as-rooms">
        {#each view.communities as c (c.id)}<li>
            <span class="as-dot" class:live={c.enabled && c.ready} aria-hidden="true"></span>
            <div>
              <strong>{c.title}</strong>
              <small>{#if !c.configured}Belum disiapkan{:else if !c.mine}Dijalankan operator lain{:else if !c.enabled}Dijeda{:else if !c.ready}{c.reason ?? 'Belum dapat bekerja'}{:else}{c.jobsToday} dari {c.dailyLimit} tugas hari ini{#if c.expires}{' · izin diperpanjang otomatis sebelum ' + date(c.expires)}{/if}{/if}</small>
            </div>
          </li>{/each}
      </ul>{:else}<p class="as-note">Belum ada komunitas publik yang kamu kelola.</p>{/if}
    {#if skipped.length}<p class="as-note">Komunitas yang dilewati adalah {skipped.map((s) => s.title + (s.reason ? ' (' + s.reason + ')' : '')).join(', ')}.</p>{/if}
    {#if error}<p class="commons-alert" role="status">{error}</p>{/if}
    <p class="as-note">Semua yang ditulis Aksara diberi label AI dan sumber, dan dapat dihapus atau dikoreksi. Usulan Wiki tetap ditinjau manusia.</p>
  </section>
{/if}

<style>
  .aksara-switch { display: grid; gap: 14px; padding: 16px; margin: 0 0 18px; border: 1px solid var(--border); border-radius: 16px; background: var(--card); }
  .as-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .as-head p { margin: 4px 0 0; font-size: 14px; line-height: 1.5; color: var(--muted-foreground); max-width: 52ch; }
  .as-facts { display: flex; flex-wrap: wrap; gap: 8px 28px; margin: 0; }
  .as-facts div { display: grid; gap: 2px; }
  dt { font-size: 12.5px; color: var(--muted-foreground); }
  dd { margin: 0; font-size: 14px; font-weight: 550; overflow-wrap: anywhere; }
  .as-rooms { margin: 0; padding: 0; list-style: none; display: grid; }
  .as-rooms li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--border); }
  .as-rooms div { display: grid; gap: 1px; min-width: 0; }
  strong { font-size: 14.5px; font-weight: 600; }
  small { font-size: 13px; color: var(--muted-foreground); }
  .as-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--border); }
  .as-dot.live { background: var(--brand); }
  .as-model { display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; }
  .as-model label { display: grid; gap: 4px; font-size: 13px; color: var(--muted-foreground); }
  .as-model select { min-height: 40px; padding: 0 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; }
  .as-save { justify-self: start; min-height: 40px; padding: 0 16px; border: 0; border-radius: 10px; background: var(--brand); color: var(--brand-foreground, #fff); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .as-save:disabled { opacity: 0.55; cursor: default; }
  .as-key { display: grid; gap: 8px; }
  .as-key-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; }
  .as-key-row > div:first-child { display: grid; gap: 2px; min-width: 0; }
  .as-key-label, .as-key-form > label { font-size: 13px; color: var(--muted-foreground); }
  .as-key-value { font-size: 14px; font-weight: 550; font-variant-numeric: tabular-nums; }
  .as-key-form { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; }
  .as-key-field { display: flex; gap: 6px; }
  .as-key-field input, .as-provider input { flex: 1; min-width: 0; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; font-family: var(--font-mono, ui-monospace, monospace); }
  .as-key-field button, .as-key-actions button:not(.as-save) { display: inline-grid; place-items: center; min-width: 40px; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--background); color: var(--foreground); font: inherit; font-size: 14px; cursor: pointer; }
  .as-key-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .as-key-form small { font-size: 12.5px; color: var(--muted-foreground); line-height: 1.45; }
  .as-key-form a { display: inline-flex; align-items: center; gap: 2px; color: var(--foreground); text-underline-offset: 3px; }
  .as-provider summary { font-size: 13px; color: var(--muted-foreground); cursor: pointer; min-height: 28px; }
  .as-provider label { display: grid; gap: 4px; margin-top: 6px; font-size: 13px; color: var(--muted-foreground); }
  .as-note { margin: 0; font-size: 13px; line-height: 1.5; color: var(--muted-foreground); }
</style>
