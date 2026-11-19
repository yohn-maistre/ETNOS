<script lang="ts">
  import { BarChart } from 'layerchart'
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import * as Chart from '$lib/components/ui/chart/index.js'
  import * as Table from '$lib/components/ui/table/index.js'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  import { chartColors, fmt, withUnit } from './chart-util'
  type Bar = { label: string; value: number; compare?: number }
  let { props }: ComponentRenderProps<{ title: string; bars: Bar[]; unit: string; sources: CardSource[]; valueName?: string; compareName?: string }> = $props()
  const hasCompare = $derived(props.bars.some((b) => typeof b.compare === 'number'))
  const nameA = $derived(props.valueName || 'Nilai')
  const nameB = $derived(props.compareName || 'Pembanding')
  const config = $derived({ value: { label: nameA, color: chartColors[0] }, compare: { label: nameB, color: chartColors[1] } })
  const series = $derived(
    hasCompare
      ? [{ key: 'value', label: nameA, color: chartColors[0] }, { key: 'compare', label: nameB, color: chartColors[1] }]
      : [{ key: 'value', label: nameA, color: chartColors[0] }],
  )
  // Long labels are cut on the axis; the tooltip and the hidden table keep them whole.
  const short = (l: string) => (l.length > 20 ? l.slice(0, 19) + '…' : l)
  const height = $derived(56 + props.bars.length * (hasCompare ? 40 : 30))
  const summary = $derived(
    props.bars.map((b) => `${b.label}: ${withUnit(b.value, props.unit)}${typeof b.compare === 'number' ? `, ${nameB} ${withUnit(b.compare, props.unit)}` : ''}`).join('; '),
  )
</script>

<Frame kind="Grafik batang" title={props.title} sources={props.sources}>
  {#if props.unit}<span class="unit">Satuan: {props.unit}</span>{/if}
  <div class="chart" style:height="{height}px" aria-hidden="true">
    <Chart.Container {config} class="!aspect-auto h-full w-full">
      <BarChart
        data={props.bars}
        orientation="horizontal"
        y="label"
        {series}
        seriesLayout="group"
        legend={hasCompare}
        padding={{ top: 4, right: 12, bottom: hasCompare ? 56 : 28, left: 118 }}
        props={{ bars: { stroke: 'none', radius: 4, rounded: 'edge' }, yAxis: { format: short }, xAxis: { format: (v: number) => fmt(v) } }}
      >
        {#snippet tooltip()}<Chart.Tooltip />{/snippet}
      </BarChart>
    </Chart.Container>
  </div>
  <div class="sr-only"><Table.Root>
    <Table.Caption>{props.title}. {summary}</Table.Caption>
    <Table.Header><Table.Row><Table.Head>Kategori</Table.Head><Table.Head>{nameA}</Table.Head>{#if hasCompare}<Table.Head>{nameB}</Table.Head>{/if}</Table.Row></Table.Header>
    <Table.Body>
      {#each props.bars as b, i (i)}<Table.Row><Table.Cell>{b.label}</Table.Cell><Table.Cell>{withUnit(b.value, props.unit)}</Table.Cell>{#if hasCompare}<Table.Cell>{typeof b.compare === 'number' ? withUnit(b.compare, props.unit) : '-'}</Table.Cell>{/if}</Table.Row>{/each}
    </Table.Body>
  </Table.Root></div>
</Frame>

<style>
  .unit { font-size: 12.5px; color: var(--muted-foreground); }
  .chart { width: 100%; min-width: 0; }
</style>
