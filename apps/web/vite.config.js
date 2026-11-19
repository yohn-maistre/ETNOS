import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) },
  },
  esbuild: { tsconfigRaw: {} },
  // The OpenUI Svelte package ships TypeScript inside .svelte files; the Svelte plugin compiles it, esbuild cannot.
  optimizeDeps: { exclude: ['@openuidev/svelte-lang'], include: ['@openuidev/lang-core', 'zod'] },
  build: { target: 'es2022', sourcemap: false },
})
