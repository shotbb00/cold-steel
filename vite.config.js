// Vite: `npm run dev` serves the game with hot reload; `npm run build` bundles it into dist/
// for any static host. `base: './'` keeps every path relative, so the build also works from a
// sub-folder such as https://<user>.github.io/<repo>/.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 8765, strictPort: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // three.js alone is ~1.2 MB before gzip
  },
});
