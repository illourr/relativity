import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const p = (relative) => resolve(root, relative);

/**
 * Bundles the playground and inlines both the script and the stylesheet into a
 * single HTML file. The output has no external requests, so it opens from disk,
 * survives being emailed around, and keeps working offline.
 */

const result = await build({
  entryPoints: [p('src/playground/main.ts')],
  bundle: true,
  format: 'esm',
  target: ['es2021'],
  minify: true,
  // Required so esbuild knows where a CSS import would land, even with
  // write:false — the stylesheet is inlined into the HTML, never written out.
  outdir: p('dist'),
  write: false,
  legalComments: 'none',
  logLevel: 'warning',
});

let js = '';
let css = '';
for (const file of result.outputFiles) {
  if (file.path.endsWith('.css')) css = file.text;
  else js = file.text;
}

if (!js) throw new Error('esbuild produced no JavaScript');
if (!css) throw new Error('esbuild produced no CSS — is styles.css imported from main.ts?');

const template = await readFile(p('index.html'), 'utf8');

for (const token of ['/*__CSS__*/', '/*__JS__*/']) {
  if (!template.includes(token)) throw new Error(`template is missing the ${token} placeholder`);
}

const html = template
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

// A literal "</script>" inside an inline module would terminate the tag early.
if (html.includes('</script>', 0) && js.includes('</script>')) {
  throw new Error('bundled JS contains a closing script tag');
}

await mkdir(p('dist'), { recursive: true });
await writeFile(p('dist/index.html'), html, 'utf8');

const kb = (text) => `${(Buffer.byteLength(text) / 1024).toFixed(1)} kB`;
console.log(`dist/index.html  ${kb(html)}  (js ${kb(js)} + css ${kb(css)})`);