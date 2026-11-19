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

const source = z.object({
  title: z.string().max(200).describe('Title or publisher of the source'),
  url: z.string().max(500).optional().describe('https link to the source'),
  year: z.number().int().optional().describe('Year the source was written'),
})
const sources = z.array(source).max(8).describe('Every source the card rests on')

export const cardLibrary = createLibrary({
  components: [
    defineComponent({
      name: 'Finding',
      description: 'Temuan: a short finding across several sources, each point traceable to a source.',
      props: z.object({ title: z.string().max(120), summary: z.string().max(600), sources, points: z.array(z.string().max(240)).max(5).optional() }),
      component: Finding,
    }),
    defineComponent({
      name: 'Figure',
      description: 'Angka: one number with its label, date and source.',
      props: z.object({ value: z.string().max(24), label: z.string().max(140), sources, date: z.string().max(40).optional(), note: z.string().max(300).optional() }),
      component: Figure,
    }),
    defineComponent({
      name: 'Compare',
      description: 'Bandingkan: two or three sources or versions that differ, side by side.',
      props: z.object({
        title: z.string().max(120),
        sides: z.array(z.object({ label: z.string().max(80), text: z.string().max(400), sources: sources.optional() })).min(2).max(3),
        note: z.string().max(300).optional(),
      }),
      component: Compare,
    }),
    defineComponent({
      name: 'Cluster',
      description: 'Kabar terkumpul: what independent sources say about one story, and links to threads about it on ETNOS.',
      props: z.object({
        title: z.string().max(140),
        summary: z.string().max(500),
        sources,
        threads: z.array(z.object({ title: z.string().max(140), url: z.string().max(200), replies: z.number().int().optional() })).max(3).optional(),
      }),
      component: Cluster,
    }),
    defineComponent({
      name: 'Timeline',
      description: 'Garis waktu: dated events about one place or topic.',
      props: z.object({ title: z.string().max(120), events: z.array(z.object({ year: z.string().max(12), text: z.string().max(200) })).min(2).max(8), sources }),
      component: Timeline,
    }),
  ],
})
