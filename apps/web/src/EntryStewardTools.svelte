<script lang="ts">
  // Node steward tools at the foot of a context's Riwayat tab: which news places show on the page, and retiring the
  // page. The server checks the steward role on every write; these only show for a node steward.
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { untrack } from 'svelte'
  import { request } from './api'

  let { context, title, newsPlaces, onError, onChanged }: { context: { id: string; aliases: string[] }; title: string; newsPlaces: string[]; onError: (m: string) => void; onChanged: () => void } = $props()
  const uid = $props.id()
  const parsePlaces = (v: string) => v.split(',').map((x) => x.trim().toLowerCase().replace(/\s+/g, '-')).filter((x) => /^[-a-z0-9]{1,100}$/.test(x))
  // An explicit list of news places shows as typed; without one the page uses its own name.
  let draft = $state(untrack(() => (context.aliases.some((a) => a.startsWith('kabar:')) ? newsPlaces.join(', ') : ''))),
    options = $state<{ slug: string; name: string }[]>([]),
    filter = $state(''),
    loaded = false,
    retired = $state(false)
  const slugs = $derived(parsePlaces(draft))
  const extra = $derived(slugs.filter((x) => !options.some((p) => p.slug === x)))
  const visible = $derived.by(() => {
    const q = filter.trim().toLowerCase()
    return q ? options.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q)) : options
  })
  async function loadOptions() {
    if (loaded) return
    loaded = true
    try {
      const r = await fetch('/v1/news', { credentials: 'omit' })
      if (r.ok) options = ((await r.json()) as { placeOptions?: { slug: string; name: string }[] }).placeOptions ?? []
    } catch {
      loaded = false
    }
  }
  const toggle = (slug: string, on: boolean) => (draft = (on ? [...slugs.filter((x) => x !== slug), slug] : slugs.filter((x) => x !== slug)).join(', '))
  const setExtra = (v: string) => (draft = [...slugs.filter((x) => options.some((p) => p.slug === x)), ...parsePlaces(v)].join(', '))
  async function save(e: SubmitEvent) {
    e.preventDefault()
    try {
      await request('/v1/contexts/' + context.id + '/aliases', { aliases: [...context.aliases.filter((a) => !a.startsWith('kabar:')), ...slugs.map((x) => 'kabar:' + x)] })
      onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Tempat kabar belum tersimpan.')
    }
  }
  async function retire() {
    try {
      await request('/v1/contexts/' + context.id + '/retire', { retired: true })
      retired = true
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Halaman belum dapat dipensiunkan.')
    }
  }
</script>

<div class="est">
  <details class="place-news-setup" ontoggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) void loadOptions() }}>
    <summary>Atur tempat kabar</summary>
    <form onsubmit={save}>
      {#if options.length}
        <Label for={uid + '-filter'}>Pilih tempat kabar</Label>
        <Input id={uid + '-filter'} type="search" bind:value={filter} placeholder="Cari tempat" autocomplete="off" />
        <div class="place-news-list" role="group" aria-label="Tempat kabar">
          {#each visible as p (p.slug)}<label class="place-news-option"><input type="checkbox" checked={slugs.includes(p.slug)} onchange={(e) => toggle(p.slug, e.currentTarget.checked)} /><span>{p.name}</span></label>
          {:else}<p class="cx-hint">Tidak ada tempat yang cocok.</p>{/each}
        </div>
        <Label for={uid + '-slugs'}>Tempat lain (nama pendek, dipisah koma)</Label>
        <Input id={uid + '-slugs'} value={extra.join(', ')} onchange={(e) => setExtra(e.currentTarget.value)} placeholder="nabire, paniai" autocomplete="off" />
      {:else}
        <Label for={uid + '-slugs'}>Nama tempat kabar, dipisah koma</Label>
        <Input id={uid + '-slugs'} bind:value={draft} placeholder="nabire, paniai, deiyai" autocomplete="off" />
      {/if}
      <p class="cx-hint">Kabar dari tempat-tempat ini tampil di halaman {title}. Kosongkan untuk memakai nama halaman ini saja.</p>
      <Button type="submit" size="sm">Simpan</Button>
    </form>
  </details>
  <details class="place-news-setup">
    <summary>Pensiunkan halaman ini</summary>
    {#if retired}<p class="cx-hint" role="status">Halaman {title} sudah dipensiunkan dan tidak lagi tampil di daftar.</p>
    {:else}<p class="cx-hint">Halaman {title} tidak lagi tampil di Jelajah, daftar dan pilihan label. Label yang sudah terpasang dan riwayatnya tetap tersimpan, dan halaman bisa dipulihkan.</p>
      <Button size="sm" variant="outline" onclick={retire}>Pensiunkan {title}</Button>{/if}
  </details>
</div>

<style>
  .est { display: grid; gap: 4px; padding: 8px var(--gutter, 24px) 20px; }
</style>
