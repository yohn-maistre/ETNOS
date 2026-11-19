import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [tailwindcss(), svelte({
      // LayerChart's component styles are injected by the component itself; the dev server cannot serve them as virtual CSS.
      dynamicCompileOptions: ({ filename }) => (filename.includes('node_modules/layerchart/') ? { css: 'injected' } : undefined),
    })],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) },
  },
  esbuild: { tsconfigRaw: {} },
  // The OpenUI and LayerChart packages ship TypeScript inside .svelte files; the Svelte plugin compiles it, esbuild cannot.
  optimizeDeps: { exclude: ['@openuidev/svelte-lang', 'layerchart'], include: ['@openuidev/lang-core', 'zod'] },
  build: { target: 'es2022', sourcemap: false },
})
