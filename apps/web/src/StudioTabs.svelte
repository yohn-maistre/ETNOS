<script lang="ts">
  // Studio is where stewards and operators work: one place, two tabs, and a third for the operator.
  let { current, operator = false }: { current: 'community' | 'agents' | 'invites' | 'settings'; operator?: boolean } = $props()
</script>

<nav class="studio-tabs" aria-label="Studio">
  <a href="/studio" aria-current={current === 'community' ? 'page' : undefined}>Komunitas</a>
  <a href="/agents" aria-current={current === 'agents' ? 'page' : undefined}>Agen & koneksi</a>
  {#if operator || current === 'invites'}<a href="/studio/undangan" aria-current={current === 'invites' ? 'page' : undefined}>Undangan</a>{/if}
  {#if operator || current === 'settings'}<a href="/studio/pengaturan" aria-current={current === 'settings' ? 'page' : undefined}>Pengaturan</a>{/if}
</nav>

<style>
  .studio-tabs {
    display: flex;
    gap: 24px;
    overflow-x: auto;
    scrollbar-width: none;
    /* Full width with the page's own gutter, so the tabs line up with the heading below on both pages. */
    padding: 0 var(--studio-gutter, 24px);
    border-bottom: 1px solid var(--reading-line);
  }
  .studio-tabs a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 15px;
    font-weight: 500;
    color: var(--muted-foreground);
    text-decoration: none;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
  }
  .studio-tabs a[aria-current='page'] {
    color: var(--foreground);
    font-weight: 600;
    border-bottom-color: var(--foreground);
  }
  .studio-tabs a:focus-visible { outline: 2px solid var(--foreground); outline-offset: 2px; border-radius: 4px; }
  :global(.agent-connections) > .studio-tabs { margin: -28px -24px 28px; }
  @media (max-width: 767px) {
    .studio-tabs { padding-inline: var(--studio-gutter, 16px); }
    :global(.agent-connections) > .studio-tabs { margin: -20px -16px 20px; }
  }
</style>
