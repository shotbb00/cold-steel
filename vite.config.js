// Vite: `npm run dev` serves the game with hot reload; `npm run build` bundles it into dist/
// for any static host. `base: './'` keeps every path relative, so the build also works from a
// sub-folder such as https://<user>.github.io/<repo>/.
// serviceWorker(): after a build, writes dist/sw.js from src/pwa/sw-template.js with this
// build's id and file list — the installed game (PWA) updates itself from it on every deploy.
import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function serviceWorker() {
  let outDir = 'dist';
  return {
    name: 'cold-steel-service-worker',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files = [];
      const walk = (dir) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).replace(/\\/g, '/'));
        }
      };
      walk(outDir);
      const list = ['./', ...files.filter((f) => !f.startsWith('sounds/') && f !== 'sw.js').map((f) => `./${f}`)];
      const build = Date.now().toString(36);
      const sw = readFileSync('src/pwa/sw-template.js', 'utf8')
        .replace("'__BUILD__'", JSON.stringify(build))
        .replace('__FILES__', JSON.stringify(list));
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  base: './',
  server: { port: 8765, strictPort: false },
  build: {
    target: 'es2022',
    outDir: 'dist',
    chunkSizeWarningLimit: 2000, // three.js alone is ~1.2 MB before gzip
  },
  plugins: [serviceWorker()],
});
