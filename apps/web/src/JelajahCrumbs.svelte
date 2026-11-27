<script lang="ts">
  // The crumb above every Ensiklopedia page. The Ensiklopedia is a section of Jelajah, so the trail starts there:
  // Jelajah › Ensiklopedia › … The /wiki index itself passes `home` and shows only Jelajah.
  import { OBSERVATORY_NAME } from './observatory-name.ts'

  let { trail = [], home = false }: { trail?: { title: string; href?: string }[]; home?: boolean } = $props()
  const items = $derived([{ title: 'Jelajah', href: '/explore' }, ...(home ? [] : [{ title: OBSERVATORY_NAME, href: '/wiki' }]), ...trail])
</script>

<nav class="jc" aria-label="Letak halaman">
  {#each items as c, i (i)}{#if i}<span class="jc-sep" aria-hidden="true">›</span>{/if}{#if c.href}<a href={c.href}>{c.title}</a>{:else}<span>{c.title}</span>{/if}{/each}
</nav>

<style>
  .jc { display: flex; flex-wrap: wrap; align-items: center; gap: 0 8px; margin: 0; font-size: 13.5px; line-height: 1.3; color: var(--muted-foreground); }
  .jc a { display: inline-flex; align-items: center; min-height: 32px; color: inherit; text-decoration: none; }
  .jc a:hover { color: var(--foreground); text-decoration: underline; text-underline-offset: 3px; }
  .jc a:focus-visible { outline: 2px solid var(--ring, var(--foreground)); outline-offset: 2px; border-radius: 4px; }
  .jc-sep { color: color-mix(in oklab, var(--muted-foreground) 70%, transparent); }
</style>
