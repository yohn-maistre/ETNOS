// Prints the system prompt that teaches an agent to write one OpenUI card (see cardPrompt() in src/cards/library.ts).
// Usage: node scripts/card-prompt.mjs > card-prompt.txt
// The library is loaded through Vite's SSR loader so the Svelte components compile as they do in the app. The prompt
// only needs the schemas, so the chart library (which Node cannot load directly) is replaced by an empty stand-in.
import { createServer } from 'vite'

const standIn = {
  name: 'card-prompt-chart-stand-in',
  enforce: 'pre',
  resolveId: (id) => (id === 'layerchart' ? '\0layerchart-stand-in' : null),
  load: (id) => (id === '\0layerchart-stand-in' ? 'export const BarChart = null, LineChart = null, Tooltip = null, getChartContext = () => ({})' : null),
}

const server = await createServer({
  configFile: new URL('../vite.config.js', import.meta.url).pathname,
  plugins: [standIn],
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
try {
  const { cardPrompt } = await server.ssrLoadModule('/src/cards/library.ts')
  process.stdout.write(cardPrompt() + '\n')
} finally {
  await server.close()
}
