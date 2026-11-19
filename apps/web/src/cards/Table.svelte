<script lang="ts">
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import * as Table from '$lib/components/ui/table/index.js'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  let { props }: ComponentRenderProps<{ title: string; columns: string[]; rows: string[][]; sources: CardSource[] }> = $props()
</script>

<Frame kind="Tabel" title={props.title} sources={props.sources}>
  <Table.Root>
    <Table.Caption class="sr-only">{props.title}</Table.Caption>
    <Table.Header>
      <Table.Row>{#each props.columns as c, i (i)}<Table.Head scope="col" class="h-auto whitespace-normal py-2 align-bottom">{c}</Table.Head>{/each}</Table.Row>
    </Table.Header>
    <Table.Body>
      {#each props.rows as row, r (r)}
        <Table.Row>{#each props.columns as _, c (c)}<Table.Cell class="whitespace-normal align-top">{row[c] ?? ''}</Table.Cell>{/each}</Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
</Frame>
