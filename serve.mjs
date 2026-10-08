import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Minimal static server for previewing dist/index.html locally. The build
 * output is a single file with no external requests, so this exists purely so
 * the page can be opened over http:// rather than file://.
 */

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 8123);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const target = url.pathname === '/' ? '/dist/index.html' : url.pathname;
  const file = resolve(root, `.${target}`);

  if (!file.startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const body = await readFile(file);
    const type = file.endsWith('.html')
      ? 'text/html; charset=utf-8'
      : file.endsWith('.js')
        ? 'text/javascript; charset=utf-8'
        : 'application/octet-stream';
    res.writeHead(200, {
      'content-type': type,
      // A preview server that serves stale bundles is worse than useless while
      // iterating on a single-page build.
      'cache-control': 'no-store, must-revalidate',
    }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});

server.listen(port, () => {
  console.log(`relativity playground → http://localhost:${port}/`);
});