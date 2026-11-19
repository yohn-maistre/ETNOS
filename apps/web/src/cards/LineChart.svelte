<script lang="ts">
  import { LineChart } from 'layerchart'
  import type { ComponentRenderProps } from '@openuidev/svelte-lang'
  import * as Chart from '$lib/components/ui/chart/index.js'
  import * as Table from '$lib/components/ui/table/index.js'
  import Frame from './Frame.svelte'
  import type { CardSource } from './Sources.svelte'
  import { chartColors, fmt, withUnit } from './chart-util'
  type Point = { x: string; y: number }
  let { props }: ComponentRenderProps<{ title: string; points: Point[]; unit: string; sources: CardSource[] }> = $props()
  // Years and dates sit at their true distance on the axis; any other label is spaced evenly.
  const mode = $derived(props.points.every((p) => /^\d{4}$/.test(p.x)) ? 'year' : props.points.every((p) => /^\d{4}-\d{2}(-\d{2})?$/.test(p.x) && !Number.isNaN(Date.parse(p.x))) ? 'date' : 'label')
  const data = $derived(props.points.map((p) => ({ x: mode === 'year' ? Number(p.x) : mode === 'date' ? new Date(p.x) : p.x, y: p.y })))
  const dateFmt = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' })
  const xFormat = (v: unknown) => (mode === 'year' ? String(v) : mode === 'date' ? dateFmt.format(v as Date) : String(v))
  const config = $derived({ y: { label: props.unit || 'Nilai', color: chartColors[0] } })
  const summary = $derived(props.points.map((p) => `${p.x}: ${withUnit(p.y, props.unit)}`).join('; '))
</script>

<Frame kind="Grafik garis" title={props.title} sources={props.sources}>
  {#if props.unit}<span class="unit">Satuan: {props.unit}</span>{/if}
  <div class="chart" aria-hidden="true">
    <Chart.Container {config} class="!aspect-auto h-full w-full">
      <LineChart
        {data}
        x="x"
        y="y"
        series={[{ key: 'y', label: props.unit || 'Nilai', color: chartColors[0] }]}
        points={{ r: 3.5 }}
        props={{ spline: { strokeWidth: 2.5 }, xAxis: { format: xFormat, ticks: mode === 'year' ? Math.min(props.points.length, 5) : undefined }, yAxis: { format: (v: number) => fmt(v) } }}
      >
        {#snippet tooltip()}<Chart.Tooltip labelFormatter={(v: unknown) => xFormat(v)} />{/snippet}
      </LineChart>
    </Chart.Container>
  </div>
  <div class="sr-only"><Table.Root>
    <Table.Caption>{props.title}. {summary}</Table.Caption>
    <Table.Header><Table.Row><Table.Head>Waktu</Table.Head><Table.Head>Nilai{props.unit ? ` (${props.unit})` : ''}</Table.Head></Table.Row></Table.Header>
    <Table.Body>
      {#each props.points as p, i (i)}<Table.Row><Table.Cell>{p.x}</Table.Cell><Table.Cell>{fmt(p.y)}</Table.Cell></Table.Row>{/each}
    </Table.Body>
  </Table.Root></div>
</Frame>

<style>
  .unit { font-size: 12.5px; color: var(--muted-foreground); }
  .chart { width: 100%; height: 220px; min-width: 0; }
</style>
