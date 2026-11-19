import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// Script preprocessing strips TypeScript with esbuild before Svelte compiles. Svelte's own stripping leaves
// optional parameters (`x?: T` becomes `x?`) in some files, including the OpenUI renderer.
export default { preprocess: vitePreprocess({ script: true }) }
