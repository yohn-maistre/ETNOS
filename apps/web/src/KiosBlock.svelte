<script lang="ts">
  // The Kios of a person or a lembaga (docs/plan/one-page-system-2026-11-21.md §7): their open offers in public
  // communities as a compact block, with contact by Pesan or a WhatsApp link the seller sets. No checkout and no
  // payment. Whoever may open it sees the switch; opening shows the house rules first.
  import { ShoppingBag, MapPin, MessageCircle, ArrowUpRight } from '@lucide/svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Switch } from '$lib/components/ui/switch/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import { Label } from '$lib/components/ui/label/index.js'
  import { request } from './api'
  import { offerTitle, offerPrice, whatsappLink, type KiosOwner, type KiosView } from './kios'

  let { owner, inline = false, onCreate }: { owner: KiosOwner; inline?: boolean; onCreate?: () => void } = $props()
  const uid = $props.id()
  let kios = $state<KiosView | null>(null),
    rulesOpen = $state(false),
    whatsapp = $state(''),
    busy = $state(false),
    problem = $state('')

  $effect(() => {
    const o = owner,
      abort = new AbortController()
    kios = null
    request<{ kios: KiosView | null }>('/v1/kios/' + o.kind + '/' + encodeURIComponent(o.id), undefined, abort.signal, true)
      .then((r) => {
        if (!abort.signal.aborted) kios = r.kios
      })
      .catch(() => {})
    return () => abort.abort()
  })
  async function save(body: Record<string, unknown>) {
    if (busy) return
    busy = true
    problem = ''
    try {
      kios = (await request<{ kios: KiosView }>('/v1/kios', { ownerKind: owner.kind, ownerId: owner.id, ...body })).kios
      rulesOpen = false
    } catch (e) {
      problem = e instanceof Error ? e.message : 'Belum tersimpan.'
    } finally {
      busy = false
    }
  }
  function toggle(on: boolean) {
    if (on) {
      whatsapp = kios?.whatsapp ? '+' + kios.whatsapp : ''
      problem = ''
      rulesOpen = true
    } else void save({ open: false })
  }
  const visible = $derived(!!kios && (kios.canManage || kios.items.length > 0))
</script>

{#if kios && visible}
  <section class="kios" class:inline aria-labelledby={uid + '-title'}>
    <div class="kios-head">
      <h2 id={uid + '-title'}><ShoppingBag size={16} aria-hidden="true" />Kios</h2>
      {#if kios.canManage}<label class="kios-switch"><span>{kios.open ? 'Buka' : 'Tutup'}</span><Switch checked={kios.open} disabled={busy} aria-label="Buka kios" onCheckedChange={toggle} /></label>{/if}
    </div>
    {#if kios.open}
      {#if kios.items.length}<ul class="kios-items">
          {#each kios.items as p (p.id)}{#if p.offering}<li>
              <a href={'/square/' + p.id}>
                <strong>{offerTitle(p)}</strong>
                <span class="kios-terms">{offerPrice(p.offering)}{#if p.offering.unit}{' · '}{p.offering.unit}{/if}</span>
                {#if p.offering.place}<span class="kios-place"><MapPin size={12} aria-hidden="true" />{p.offering.place.title}</span>{/if}
              </a>
            </li>{/if}{/each}
        </ul>
      {:else}<p class="kios-note">Belum ada penawaran yang terbuka. Penawaran di komunitas publik tampil di sini.</p>{/if}
      <div class="kios-contact">
        {#if owner.kind === 'actor' && !kios.canManage}<Button variant="outline" size="sm" href={'/messages?to=' + encodeURIComponent(owner.id)}><MessageCircle size={15} />Kirim pesan</Button>{/if}
        {#if kios.whatsapp}<Button variant="outline" size="sm" href={whatsappLink(kios.whatsapp, kios.owner.title)} target="_blank" rel="noreferrer">WhatsApp<ArrowUpRight size={14} /></Button>{/if}
        {#if kios.canManage && onCreate}<Button variant="ghost" size="sm" onclick={onCreate}>Buat penawaran</Button>{/if}
      </div>
      <p class="kios-foot">Pembayaran tidak lewat ETNOS. Sepakati langsung dengan penjual.</p>
    {:else if kios.canManage}<p class="kios-note">Buka kios supaya penawaranmu di komunitas publik tampil di sini dan di halaman tempat yang kamu pilih.</p>{/if}
    {#if problem && !rulesOpen}<p class="kios-note" role="alert">{problem}</p>{/if}
  </section>
{/if}

<Dialog.Root bind:open={rulesOpen}>
  <Dialog.Content class="platform-dialog">
    <Dialog.Header>
      <Dialog.Title>Buka kios</Dialog.Title>
      <Dialog.Description>Kios menampilkan penawaranmu yang terbuka di komunitas publik. Orang menghubungimu lewat Pesan atau WhatsApp, dan pembayaran tidak lewat ETNOS.</Dialog.Description>
    </Dialog.Header>
    <form class="kios-form" onsubmit={(e) => { e.preventDefault(); void save({ open: true, acceptRules: true, whatsapp: whatsapp.trim() }) }}>
      <div class="kios-rules">
        <h3>Aturan kios</h3>
        <ul>{#each kios?.rules ?? [] as r (r.key)}<li>{r.label}</li>{/each}</ul>
        <p>Penawaran yang melanggar aturan ini ditolak, dan orang lain dapat melaporkannya.</p>
      </div>
      <Label for={uid + '-wa'}>Nomor WhatsApp (boleh dikosongkan)</Label>
      <Input id={uid + '-wa'} type="tel" inputmode="tel" autocomplete="tel" bind:value={whatsapp} placeholder="0812 3456 7890" maxlength={20} />
      {#if problem}<p class="kios-note" role="alert">{problem}</p>{/if}
      <div class="kios-actions">
        <Button type="button" variant="ghost" onclick={() => (rulesOpen = false)}>Batal</Button>
        <Button type="submit" disabled={busy}>Setuju dan buka</Button>
      </div>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  .kios { display: grid; gap: 10px; min-width: 0; }
  .kios.inline { padding: 18px var(--gutter, 24px) 20px; border-bottom: 1px solid var(--border); }
  @media (min-width: 1360px) { .kios.inline { display: none; } }
  .kios-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .kios h2 { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 14px; font-weight: 650; }
  .kios-switch { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted-foreground); cursor: pointer; }
  .kios-items { display: grid; margin: 0; padding: 0; list-style: none; }
  .kios-items li + li { border-top: 1px solid var(--border); }
  .kios-items a { display: grid; gap: 2px; padding: 9px 0; color: inherit; text-decoration: none; }
  .kios-items strong { font-size: 14.5px; font-weight: 650; line-height: 1.3; overflow-wrap: anywhere; }
  .kios-items a:hover strong { text-decoration: underline; text-underline-offset: 3px; }
  .kios-terms { font-size: 13.5px; font-variant-numeric: tabular-nums; }
  .kios-place { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted-foreground); }
  .kios-contact { display: flex; flex-wrap: wrap; gap: 6px; }
  .kios-note, .kios-foot { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .kios-foot { font-size: 12.5px; }
  .kios-form { display: grid; gap: 10px; }
  .kios-rules { display: grid; gap: 6px; padding: 14px; border-radius: 14px; background: color-mix(in oklab, var(--foreground) 3%, transparent); }
  .kios-rules h3 { margin: 0; font-size: 14.5px; font-weight: 700; }
  .kios-rules ul { display: grid; gap: 4px; margin: 0; padding-left: 18px; list-style: disc; font-size: 14.5px; line-height: 1.45; }
  .kios-rules p { margin: 0; font-size: 13.5px; color: var(--muted-foreground); }
  .kios-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
</style>
