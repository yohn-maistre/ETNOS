<script lang="ts">
  // The Letak rail of an entry page (docs/plan/one-page-system-2026-11-21.md §3): where the entry sits in its chain
  // (a place in the administrative spine with its wilayah adat beside it, a language in its family, a topic in its
  // group, a species in its taxonomy), with the current entry open, then the lembaga that manages it, the communities that label it, the lembaga
  // that point here, the Kios that sell here and the entries most often named with it. Each part shows only when something points here.
  // In the shell's side rail it stays put while the page scrolls; on narrow screens the page shows it inline.
  import { ChevronDown, CornerDownRight } from '@lucide/svelte'
  import { initials } from './api'
  import { avatarTone } from './avatar-tone'
  import type { Entry } from './entri'
  import KiosPlace from './KiosPlace.svelte'

  let { entry, inline = false }: { entry: Entry; inline?: boolean } = $props()
  const uid = $props.id()
  const FIRST = 8
  let allChildren = $state(false),
    allRooms = $state(false)
  const children = $derived(allChildren ? entry.children : entry.children.slice(0, FIRST))
  const rooms = $derived(allRooms ? entry.communities : entry.communities.slice(0, 5))
  const isPlace = $derived(entry.kind === 'tempat' || entry.kind === 'bentang-alam' || entry.kind === 'suku' || !!entry.place)
</script>

<div class="er" class:inline>
  <nav class="er-block" aria-labelledby={uid + '-letak'}>
    <h2 id={uid + '-letak'}>Letak</h2>
    <ol class="er-tree">
      {#each entry.chain as c, i (i)}<li style={`--d:${Math.min(i, 4)}`}>
          {#if c.href}<a href={c.href}>{c.title}</a>{:else}<span>{c.title}</span>{/if}
        </li>{/each}
      <li class="er-here" style={`--d:${Math.min(entry.chain.length, 4)}`} aria-current="page">
        <strong>{entry.title}</strong>
        {#if entry.children.length}<ul class="er-children" aria-label={'Di dalam ' + entry.title}>
            {#each children as ch (ch.slug)}<li><a href={ch.href}>{ch.title}</a></li>{/each}
            {#if entry.children.length > FIRST}<li><button type="button" class="er-more" aria-expanded={allChildren} onclick={() => (allChildren = !allChildren)}>{allChildren ? 'Tampilkan lebih sedikit' : 'Semua ' + entry.children.length}<ChevronDown size={14} aria-hidden="true" /></button></li>{/if}
          </ul>{/if}
      </li>
    </ol>
    {#if entry.overlay.length && isPlace}<p class="er-overlay"><CornerDownRight size={14} aria-hidden="true" /><span>Wilayah adat {#each entry.overlay as o, i (o.slug)}{#if i}<span aria-hidden="true">, </span>{/if}<a href={o.href}>{o.title}</a>{/each}</span></p>{/if}
  </nav>

  {#if entry.managedBy}<section class="er-block" aria-labelledby={uid + '-managed'}>
      <h2 id={uid + '-managed'}>Dikelola oleh</h2>
      <a class="er-room" href={'/groups/' + entry.managedBy.id}>
        <span class="cx-avatar sage small avatar-tinted" style={avatarTone(entry.managedBy.id)} aria-hidden="true">{initials(entry.managedBy.title)}</span>
        <span><strong>{entry.managedBy.title}</strong><small>Halaman lembaga</small></span>
      </a>
    </section>{/if}

  {#if entry.communities.length}<section class="er-block" aria-labelledby={uid + '-rooms'}>
      <h2 id={uid + '-rooms'}>Komunitas di sini</h2>
      <div class="er-rooms">
        {#each rooms as c (c.id)}<a class="er-room" href={'/communities/' + c.id}>
            <span class="cx-avatar sage small avatar-tinted" style={avatarTone(c.id)} aria-hidden="true">{initials(c.title)}</span>
            <span><strong>{c.title}</strong><small>{c.via ? 'Lewat ' + c.via.title : c.visibility === 'public' ? 'Publik' : 'Khusus anggota'}</small></span>
          </a>{/each}
        {#if entry.communities.length > 5}<button type="button" class="er-more" aria-expanded={allRooms} onclick={() => (allRooms = !allRooms)}>{allRooms ? 'Tampilkan lebih sedikit' : 'Semua ' + entry.communities.length + ' komunitas'}<ChevronDown size={14} aria-hidden="true" /></button>{/if}
      </div>
    </section>{/if}

  {#if entry.groups.length}<section class="er-block" aria-labelledby={uid + '-groups'}>
      <h2 id={uid + '-groups'}>Lembaga terkait</h2>
      <ul class="er-links">{#each entry.groups as g (g.id)}<li><a href={'/groups/' + g.id}>{g.title}</a></li>{/each}</ul>
    </section>{/if}

  {#if entry.kios?.length}<div class="er-block"><KiosPlace items={entry.kios} place={entry.title} rail /></div>{/if}

  {#if entry.related.length}<section class="er-block" aria-labelledby={uid + '-related'}>
      <h2 id={uid + '-related'}>Terkait</h2>
      <ul class="er-links">{#each entry.related as r (r.slug)}<li><a href={r.href}><span>{r.title}</span>{#if r.sub}<small>{r.sub}</small>{/if}</a></li>{/each}</ul>
    </section>{/if}
</div>

<style>
  .er { display: grid; gap: 22px; }
  .er.inline { gap: 20px; padding: 18px var(--gutter, 24px) 22px; border-bottom: 1px solid var(--border); }
  .er-block { display: grid; gap: 8px; min-width: 0; }
  .er h2 { margin: 0; font-size: 14px; font-weight: 650; color: var(--foreground); }
  .er-tree { margin: 0; padding: 0; list-style: none; display: grid; }
  .er-tree > li { position: relative; padding-left: calc(var(--d) * 12px); min-width: 0; }
  .er-tree > li + li::before { content: ''; position: absolute; left: calc(var(--d) * 12px - 8px); top: 0; height: 15px; width: 6px; border-left: 1px solid var(--border); border-bottom: 1px solid var(--border); border-bottom-left-radius: 4px; }
  .er-tree a, .er-tree span { display: inline-flex; align-items: center; min-height: 30px; font-size: 14px; color: var(--muted-foreground); text-decoration: none; overflow-wrap: anywhere; }
  .er-tree a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .er-here > strong { display: inline-flex; align-items: center; min-height: 30px; font-size: 14.5px; font-weight: 700; color: var(--foreground); overflow-wrap: anywhere; }
  .er-children { margin: 2px 0 0; padding: 0 0 0 10px; list-style: none; display: grid; border-left: 1px solid var(--border); }
  .er-children a { min-height: 30px; font-size: 14px; color: var(--foreground); }
  .er-more { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 4px; min-height: 32px; font-size: 13.5px; font-weight: 600; color: var(--brand, var(--foreground)); cursor: pointer; }
  .er-more[aria-expanded='true'] :global(svg) { transform: rotate(180deg); }
  .er-overlay { display: flex; gap: 6px; align-items: flex-start; margin: 2px 0 0; font-size: 13.5px; line-height: 1.45; color: var(--muted-foreground); }
  .er-overlay :global(svg) { flex: none; margin-top: 2px; }
  .er-overlay a { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: color-mix(in oklab, currentColor 35%, transparent); }
  .er-rooms { display: grid; }
  .er-room { display: flex; align-items: center; gap: 10px; min-height: 48px; color: inherit; text-decoration: none; }
  .er-room > span:last-child { display: grid; min-width: 0; }
  .er-room strong { font-size: 14.5px; font-weight: 650; line-height: 1.3; overflow-wrap: anywhere; }
  .er-room small { font-size: 13px; color: var(--muted-foreground); }
  .er-room:hover strong { text-decoration: underline; text-underline-offset: 3px; }
  .er-links { margin: 0; padding: 0; list-style: none; display: grid; }
  .er-links a { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; min-height: 36px; padding: 6px 0; border-top: 1px solid var(--border); color: var(--foreground); text-decoration: none; font-size: 14.5px; line-height: 1.3; }
  .er-links li:first-child a { border-top: 0; }
  .er-links small { flex: none; font-size: 12.5px; color: var(--muted-foreground); }
  .er-links a:hover span { text-decoration: underline; text-underline-offset: 3px; }
  .er a:focus-visible, .er button:focus-visible { outline: 2px solid var(--ring, var(--brand)); outline-offset: 2px; border-radius: 4px; }
  .inline .er-tree a, .inline .er-children a { min-height: 36px; }
  .inline .er-links a { min-height: 44px; }
  @media (prefers-reduced-motion: no-preference) { .er-more :global(svg) { transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1); } }
</style>
