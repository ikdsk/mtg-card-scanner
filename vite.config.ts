import { defineConfig, type ViteDevServer } from 'vite';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Catalog .gz is an opaque, hash-verified asset, not HTTP content encoding.
// Vite's default static server sets gzip encoding based on the extension.
function catalogTransport(server: Pick<ViteDevServer, 'middlewares'>, root: string): void {
  server.middlewares.use((req, res, next) => {
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
    catch { next(); return; }
    if (!pathname.startsWith('/recognition/assets/') || !pathname.endsWith('.gz') || !['GET', 'HEAD'].includes(req.method ?? '')) { next(); return; }
    const target = resolve(root, '.' + pathname);
    if (!target.startsWith(resolve(root, 'recognition/assets') + sep)) { next(); return; }
    void stat(target).then(info => {
      if (!info.isFile()) { next(); return; }
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', info.size);
      res.setHeader('Cache-Control', 'no-cache');
      if (req.method === 'HEAD') { res.end(); return; }
      const stream = createReadStream(target);
      stream.on('error', error => res.destroy(error));
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    }, () => next());
  });
}
export default defineConfig({
  server: { host: '127.0.0.1' }, build: { target: 'es2022' },
  plugins: [{
    name: 'catalog-compressed-asset-transport',
    configureServer(server) { catalogTransport(server, server.config.publicDir); },
    configurePreviewServer(server) { catalogTransport(server, resolve(server.config.root, server.config.build.outDir)); },
  }],
});
