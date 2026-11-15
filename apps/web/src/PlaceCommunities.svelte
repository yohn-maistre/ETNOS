<script module lang="ts">
  export type PlaceCommunity = {
    id: string
    title: string
    description: string
    visibility: 'public' | 'listed-private'
    admission: 'open' | 'approval' | 'invite'
    via: { slug: string; title: string } | null
    kinds: { slug: string; title: string }[]
  }
</script>

<script lang="ts">
  // Communities that say they belong to this place, kind or language, or to
  // anything beneath it. Rows come from the context read; nothing is invented
  // for a place that has none.
  import { avatarTone } from './avatar-tone'
  import { initials } from './api'
  let { communities, title, onStart }: { communities: PlaceCommunity[]; title: string; onStart?: () => void } = $props()
  const uid = $props.id()
  const entry = { open: 'Terbuka', approval: 'Minta bergabung', invite: 'Dengan undangan' }
</script>

<section class="place-communities" id="context-communities" aria-labelledby={'pc-' + uid}>
  <header>
    <h2 id={'pc-' + uid}>Komunitas{#if communities.length}<span>{communities.length}</span>{/if}</h2>
    <a href="/communities">Semua komunitas</a>
  </header>
  {#if communities.length}
    <ul>
      {#each communities as c (c.id)}
        <li>
          <a href={'/communities/' + c.id}>
            <span class="pc-mark avatar-tinted" style={avatarTone(c.id)} aria-hidden="true">{initials(c.title)}</span>
            <span class="pc-text">
              <strong>{c.title}</strong>
              {#if c.description}<span class="pc-about">{c.description}</span>{/if}
              <small>{[c.via?.title, ...c.kinds.map((k) => k.title), c.visibility === 'public' ? '' : 'Khusus anggota'].filter(Boolean).join(' · ')}</small>
            </span>
            <span class="pc-entry">{entry[c.admission]}</span>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <p>Belum ada komunitas yang menandai {title}. Pengurus komunitas bisa menambahkannya dari halaman komunitasnya.</p>
  {/if}
  {#if onStart}<button type="button" class="pc-start" onclick={onStart}>Mulai komunitas di sini</button>{/if}
</section>

<style>
  .place-communities { padding: 8px 24px 12px; border-bottom: 1px solid var(--reading-line); }
  header { display: flex; align-items: baseline; justify-content: space-between; padding: 12px 0 4px; }
  h2 { margin: 0; display: flex; align-items: baseline; gap: 6px; font-size: 17px; font-weight: 600; }
  h2 span { font-size: 14px; font-weight: 500; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  header a { font-size: 13px; color: var(--muted-foreground); min-height: 32px; display: inline-flex; align-items: center; }
  ul { list-style: none; margin: 0; padding: 0; }
  li + li { border-top: 1px solid var(--reading-line); }
  li a { display: flex; gap: 12px; align-items: center; padding: 12px 0; min-height: 44px; color: inherit; text-decoration: none; }
  li a:hover strong { text-decoration: underline; }
  .pc-mark { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; font-size: 14px; font-weight: 600; }
  .pc-text { flex: 1; min-width: 0; display: grid; gap: 2px; }
  strong { font-size: 15px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
  .pc-about { font-size: 14px; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  small { font-size: 12px; color: var(--muted-foreground); }
  small:empty { display: none; }
  .pc-entry { flex: none; min-height: 32px; display: inline-flex; align-items: center; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; font-weight: 600; }
  li a:hover .pc-entry { border-color: var(--brand); color: var(--brand); }
  .pc-start { min-height: 44px; margin: 4px 0 8px; padding: 0 16px; border: 1px solid var(--border); border-radius: 999px; background: none; color: inherit; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .pc-start:hover { border-color: var(--brand); color: var(--brand); }
  p { margin: 0; padding: 6px 0 12px; font-size: 14px; color: var(--muted-foreground); max-width: 60ch; }
  @media (max-width: 640px) {
    .place-communities { padding-inline: 16px; }
    .pc-entry { display: none; }
  }
</style>
