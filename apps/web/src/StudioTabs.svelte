<script lang="ts">
  // Studio is where stewards and operators work: one place, two tabs.
  let { current }: { current: 'community' | 'agents' } = $props()
</script>

<nav class="studio-tabs" aria-label="Studio">
  <a href="/studio" aria-current={current === 'community' ? 'page' : undefined}>Komunitas</a>
  <a href="/agents" aria-current={current === 'agents' ? 'page' : undefined}>Agen & koneksi</a>
</nav>

<style>
  .studio-tabs {
    display: flex;
    gap: 24px;
    padding: 0 4px;
    margin-bottom: 16px;
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
    border-bottom: 2px solid transparent;
  }
  .studio-tabs a[aria-current='page'] {
    color: var(--foreground);
    font-weight: 600;
    border-bottom-color: var(--foreground);
  }
</style>
