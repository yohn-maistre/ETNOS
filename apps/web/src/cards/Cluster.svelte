<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ title: string; summary: string; threads?: { title: string; url: string; replies?: number }[]; sources: CardSource[] }> = $props()
  // Thread links stay inside ETNOS.
  const local = (u: string) => (u.startsWith('/') && !u.startsWith('//') ? u : undefined)
</script>

<Frame kind="Kabar terkumpul" title={props.title} sources={props.sources}>
  <div class="part"><h4>Apa kata sumber</h4><p>{props.summary}</p></div>
  {#if props.threads?.length}<div class="part"><h4>Di ETNOS</h4>
      <ul>{#each props.threads.slice(0, 3) as t, i (i)}<li>{#if local(t.url)}<a href={local(t.url)}>{t.title}</a>{:else}{t.title}{/if}{#if t.replies}<span> · {t.replies} balasan</span>{/if}</li>{/each}</ul>
    </div>{/if}
</Frame>

<style>
  .part { display: grid; gap: 4px; }
  h4 { margin: 0; font-size: 13px; font-weight: 600; color: var(--muted-foreground); }
  p { margin: 0; }
  ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 2px; }
  a { color: var(--foreground); text-underline-offset: 3px; display: inline-block; min-height: 28px; }
  span { color: var(--muted-foreground); font-size: 13px; }
</style>
