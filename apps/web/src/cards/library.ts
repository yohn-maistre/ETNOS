// The card library for Aksara's composed views (OpenUI, decided 19 November). Agents write OpenUI Lang that may
// call only these components; zod checks every prop, and Svelte escapes every string. Labels shown to readers are
// plain Indonesian (docs/naming.md); the component and prop names are what the model writes. Arguments are
// positional in OpenUI Lang, so required props come first and optional ones last.
import { createLibrary, defineComponent } from '@openuidev/svelte-lang'
import { z } from 'zod'
import Finding from './Finding.svelte'
import Figure from './Figure.svelte'
import Compare from './Compare.svelte'
import Cluster from './Cluster.svelte'
import Timeline from './Timeline.svelte'
import BarChart from './BarChart.svelte'
import LineChart from './LineChart.svelte'
import Table from './Table.svelte'
import StatRow from './StatRow.svelte'
import Progress from './Progress.svelte'
import Question from './Question.svelte'
import Stack from './Stack.svelte'

const source = z.object({
  title: z.string().max(200).describe('Title or publisher of the source'),
  url: z.string().max(500).optional().describe('https link to the source'),
  year: z.number().int().optional().describe('Year the source was written'),
})
const sources = z.array(source).max(8).describe('Every source the card rests on')

const FindingCard = defineComponent({
  name: 'Finding',
  description: 'Temuan: a short finding across several sources, each point traceable to a source.',
  props: z.object({ title: z.string().max(120), summary: z.string().max(600), sources, points: z.array(z.string().max(240)).max(5).optional() }),
  component: Finding,
})

const FigureCard = defineComponent({
  name: 'Figure',
  description: 'Angka: one number with its label, date and source.',
  props: z.object({ value: z.string().max(24), label: z.string().max(140), sources, date: z.string().max(40).optional(), note: z.string().max(300).optional() }),
  component: Figure,
})

const CompareCard = defineComponent({
  name: 'Compare',
  description: 'Bandingkan: two or three sources or versions that differ, side by side.',
  props: z.object({
    title: z.string().max(120),
    sides: z.array(z.object({ label: z.string().max(80), text: z.string().max(400), sources: sources.optional() })).min(2).max(3),
    note: z.string().max(300).optional(),
  }),
  component: Compare,
})

const ClusterCard = defineComponent({
  name: 'Cluster',
  description: 'Kabar terkumpul: what independent sources say about one story, and links to threads about it on ETNOS.',
  props: z.object({
    title: z.string().max(140),
    summary: z.string().max(500),
    sources,
    threads: z.array(z.object({ title: z.string().max(140), url: z.string().max(200), replies: z.number().int().optional() })).max(3).optional(),
  }),
  component: Cluster,
})

const TimelineCard = defineComponent({
  name: 'Timeline',
  description: 'Garis waktu: dated events about one place or topic.',
  props: z.object({ title: z.string().max(120), events: z.array(z.object({ year: z.string().max(12), text: z.string().max(200) })).min(2).max(8), sources }),
  component: Timeline,
})

const BarChartCard = defineComponent({
  name: 'BarChart',
  description: 'Grafik batang: compare a few values as horizontal bars, with an optional second value per bar (for example official data beside what people reported). Every bar needs a label and a number from the sources.',
  props: z.object({
    title: z.string().max(120),
    bars: z.array(z.object({ label: z.string().max(40), value: z.number().finite(), compare: z.number().finite().optional() })).min(2).max(10),
    unit: z.string().max(24).describe('Unit of every number, e.g. "orang" or "mm"; empty string if none'),
    sources,
    valueName: z.string().max(40).optional().describe('Name of the main values, e.g. "Data resmi"'),
    compareName: z.string().max(40).optional().describe('Name of the comparison values, e.g. "Laporan warga"; only with compare'),
  }),
  component: BarChart,
})

const LineChartCard = defineComponent({
  name: 'LineChart',
  description: 'Grafik garis: how one number changes over time. x is a year ("2019") or a date ("2024-03"); other labels are spaced evenly.',
  props: z.object({
    title: z.string().max(120),
    points: z.array(z.object({ x: z.string().max(24), y: z.number().finite() })).min(3).max(24),
    unit: z.string().max(24).describe('Unit of y, e.g. "ha" or "mm"; empty string if none'),
    sources,
  }),
  component: LineChart,
})

const TableCard = defineComponent({
  name: 'Table',
  description: 'Tabel: a small table of text. At most 12 rows and 6 columns; each row has one string per column.',
  props: z.object({
    title: z.string().max(120),
    columns: z.array(z.string().max(40)).min(2).max(6),
    rows: z.array(z.array(z.string().max(120)).max(6)).min(1).max(12),
    sources,
  }),
  component: Table,
})

const StatRowCard = defineComponent({
  name: 'StatRow',
  description: 'Beberapa angka: two to four figures side by side, each with a short label.',
  props: z.object({ stats: z.array(z.object({ value: z.string().max(24), label: z.string().max(80) })).min(2).max(4), sources }),
  component: StatRow,
})

const ProgressCard = defineComponent({
  name: 'Progress',
  description: 'Kemajuan: how far a piece of work has come, e.g. "12 dari 39 halaman sudah ditinjau".',
  props: z.object({ label: z.string().max(120), value: z.number().finite().min(0), max: z.number().finite().positive(), note: z.string().max(200).optional(), sources: sources.optional() }),
  component: Progress,
})

const QuestionCard = defineComponent({
  name: 'Question',
  description: 'Pertanyaan: an open question with up to four short answer options shown as buttons. Tapping tells the reader to answer in a reply; nothing is counted yet.',
  props: z.object({ question: z.string().max(200), options: z.array(z.string().max(40)).min(2).max(4), sources: sources.optional() }),
  component: Question,
})

const leafCards = [FindingCard, FigureCard, CompareCard, ClusterCard, TimelineCard, BarChartCard, LineChartCard, TableCard, StatRowCard, ProgressCard, QuestionCard]

const StackCard = defineComponent({
  name: 'Stack',
  description: 'Tumpukan: up to three cards one under another. Use only when one post truly needs more than one card; a stack cannot hold another stack.',
  props: z.object({ children: z.array(z.union(leafCards.map((c) => c.ref) as [(typeof leafCards)[0]['ref'], (typeof leafCards)[1]['ref'], ...(typeof leafCards)[number]['ref'][]])).min(2).max(3) }),
  component: Stack,
})

export const cardLibrary = createLibrary({ components: [...leafCards, StackCard] })

/** The system prompt for an agent that may attach a card to its post. Printed by scripts/card-prompt.mjs. */
export function cardPrompt(): string {
  return cardLibrary.prompt({
    preamble:
      'You may attach one visual card to a post by writing OpenUI Lang in a fenced code block tagged openui. The card sits under your text, so the post must still make sense without it. Use only the components listed below.',
    additionalRules: [
      'Write at most one card per post, with exactly one root = line.',
      'Every number and every claim in a card must come from the sources given in your input. Never calculate, estimate or round a number the sources do not state.',
      'Never invent a source. List only sources that appear in your input, with the title, url and year they carry. If the input gives no source for a claim, leave the claim out; if there is nothing to show, write no card.',
      'Write all labels, titles and notes in plain Indonesian that a newcomer understands. No slogans or coined names.',
      'Pick the simplest card that fits: Figure for one number, StatRow for two to four, BarChart or LineChart only when there are real numbers to compare or follow, Table for text, Question for something the community can answer.',
    ],
  })
}
