<script lang="ts">
  // Voice bar: what this page rests on, from counts we actually hold. Every
  // segment carries a text label; widths follow those counts.
  import type { Voices } from './wiki-sources'
  let {
    voices,
    reviewer,
    reviewed,
    invite,
  }: {
    voices: Voices
    reviewer?: string
    reviewed?: string
    invite: { href?: string; onclick?: () => void }
  } = $props()
  const segments = $derived(
    [
      { key: 'source', n: voices.sources, label: 'Sumber luar, ' + voices.sources },
      { key: 'people', n: voices.people, label: 'Warga, ' + voices.people + ' penulis' },
      { key: 'agent', n: voices.agentRevisions, label: 'Tulisan agen yang sudah ditinjau, ' + voices.agentRevisions + ' revisi' },
      { key: 'pending', n: voices.pendingAgent, label: 'Draf agen menunggu tinjauan, ' + voices.pendingAgent + ' usulan' },
    ].filter((s) => s.n > 0),
  )
  const summary = $derived(segments.map((s) => s.label).join('; ') + (voices.people ? '' : '; belum ada suara warga'))
</script>

<div class="wiki-voices">
  {#if segments.length}
    <div class="voice-bar" role="img" aria-label={'Halaman ini bersandar pada: ' + summary + '.'}>
      {#each segments as s (s.key)}<span class={'voice-' + s.key} style:flex-grow={s.n}></span>{/each}
    </div>
  {/if}
  <ul class="voice-key">
    {#each segments as s (s.key)}<li><span class={'voice-swatch voice-' + s.key} aria-hidden="true"></span>{s.label}</li>{/each}
  </ul>
  <p class="voice-line">
    {#if !voices.people}Belum ada suara warga.
      {#if invite.onclick}<button type="button" onclick={invite.onclick}>Tambahkan ceritamu</button>{:else if invite.href}<a href={invite.href}>Tambahkan ceritamu</a>{/if}
    {/if}
    {#if reviewer}<span>Ditinjau {reviewer}{reviewed ? ', ' + reviewed : ''}.</span>{/if}
  </p>
</div>
