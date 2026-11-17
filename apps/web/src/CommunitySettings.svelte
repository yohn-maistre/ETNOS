<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Textarea } from '$lib/components/ui/textarea/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { request, type Community } from './api'

  let { community, onSaved }: { community: Community; onSaved?: (c: Community) => void } = $props()

  let title = $state(''),
    description = $state(''),
    admission = $state<Community['admission']>('open'),
    busy = $state(false),
    message = $state(''),
    error = $state('')

  $effect(() => {
    title = community.title
    description = community.description
    admission = community.admission
  })

  const choices: { value: Community['admission']; label: string; hint: string }[] = [
    { value: 'open', label: 'Terbuka', hint: 'Siapa pun yang masuk bisa langsung bergabung dan memposting.' },
    { value: 'approval', label: 'Dengan persetujuan', hint: 'Orang mengajukan diri, pengelola menyetujui.' },
    { value: 'invite', label: 'Dengan undangan', hint: 'Hanya orang yang diundang pengelola.' },
  ]
  const allowed = $derived(
    choices.filter((c) =>
      community.visibility === 'public' ? true : community.visibility === 'hidden-private' ? c.value === 'invite' : c.value !== 'open',
    ),
  )

  async function save(e: SubmitEvent) {
    e.preventDefault()
    if (busy) return
    busy = true
    message = ''
    error = ''
    try {
      const next = await request<Community>(`/v1/communities/${community.id}/settings`, { title, description, admission })
      message = 'Tersimpan.'
      onSaved?.(next)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
</script>

<form class="community-settings" onsubmit={save}>
  <h3>Pengaturan komunitas</h3>
  <div class="field">
    <Label for="cs-title">Nama</Label>
    <Input id="cs-title" maxlength={100} bind:value={title} required />
  </div>
  <div class="field">
    <Label for="cs-description">Deskripsi</Label>
    <Textarea id="cs-description" maxlength={2000} rows={3} bind:value={description} required />
  </div>
  <fieldset class="field">
    <legend>Cara bergabung</legend>
    {#each allowed as c}
      <label class="choice">
        <input type="radio" name="cs-admission" value={c.value} bind:group={admission} />
        <span><strong>{c.label}</strong><small>{c.hint}</small></span>
      </label>
    {/each}
  </fieldset>
  <div class="actions">
    <Button type="submit" class="cx-button small" disabled={busy}>Simpan</Button>
    {#if message}<span class="note" role="status">{message}</span>{/if}
    {#if error}<span class="note error" role="alert">{error}</span>{/if}
  </div>
</form>

<style>
  .community-settings { display: grid; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  h3 { font-size: 15px; font-weight: 600; margin: 0; }
  .field { display: grid; gap: 6px; border: 0; padding: 0; margin: 0; }
  legend { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
  .choice { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; cursor: pointer; }
  .choice input { margin-top: 3px; }
  .choice span { display: grid; gap: 2px; }
  .choice small { color: var(--muted-foreground); font-size: 13px; }
  .actions { display: flex; gap: 12px; align-items: center; }
  .note { font-size: 13px; color: var(--muted-foreground); }
  .note.error { color: var(--destructive); }
</style>
