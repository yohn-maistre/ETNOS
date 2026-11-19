<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import Frame from './Frame.svelte'
  import Sources, { type CardSource } from './Sources.svelte'
  type Side = { label: string; text: string; sources?: CardSource[] }
  let { props }: ComponentRenderProps<{ title: string; sides: Side[]; note?: string }> = $props()
</script>

<Frame kind="Bandingkan" title={props.title}>
  <div class="sides" style={'--n:' + Math.min(3, props.sides.length)}>
    {#each props.sides.slice(0, 3) as s, i (i)}<section>
        <h4>{s.label}</h4>
        <p>{s.text}</p>
        <Sources sources={s.sources ?? []} />
      </section>{/each}
  </div>
  {#if props.note}<p class="note">{props.note}</p>{/if}
</Frame>

<style>
  .sides { display: grid; gap: 10px; }
  @media (min-width: 640px) { .sides { grid-template-columns: repeat(var(--n), minmax(0, 1fr)); } }
  section { display: grid; gap: 6px; align-content: start; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; }
  h4 { margin: 0; font-size: 13.5px; font-weight: 600; }
  p { margin: 0; }
  .note { font-size: 13.5px; color: var(--muted-foreground); }
</style>
