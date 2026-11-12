// THROWAWAY POC: serve `build-demo/` like a static web host would, with clean
// URLs (`/trino` -> `trino.html`) and `404.html` as the fallback. Browsers do
// not load the app's JavaScript modules from `file://`.
//
//   npm run build:demo && npm run serve:demo
//
// Set COCKPIT_DEMO_BASE_PATH to the same value for both commands to serve the
// demo under a path, e.g. `/cockpit-demo`. PORT defaults to 4180, so it does
// not clash with `vite preview` and the E2E tests on 4173.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'build-demo');
const basePath = process.env.COCKPIT_DEMO_BASE_PATH ?? '';
const port = Number(process.env.PORT ?? 4180);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm'
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname));
  if (basePath) {
    if (!path.startsWith(basePath)) {
      res.writeHead(302, { location: basePath + '/' });
      res.end();
      return;
    }
    path = path.slice(basePath.length) || '/';
  }
  const file = join(root, path);
  for (const candidate of [file, file + '.html', join(file, 'index.html')]) {
    if (await isFile(candidate)) {
      res.writeHead(200, {
        'content-type': types[extname(candidate)] ?? 'application/octet-stream'
      });
      res.end(await readFile(candidate));
      return;
    }
  }
  // Usually a tab still open from before a rebuild asking for old chunk names.
  console.warn(`404 ${req.url}`);
  res.writeHead(404, { 'content-type': types['.html'] });
  res.end(await readFile(join(root, '404.html')));
})
  .on('error', (err) => {
    if (err.code !== 'EADDRINUSE') throw err;
    console.error(`Port ${port} is already in use. Stop the other server or set PORT.`);
    process.exit(1);
  })
  .listen(port, () => {
    console.log(`Serving the static demo on http://localhost:${port}${basePath}/`);
  });
