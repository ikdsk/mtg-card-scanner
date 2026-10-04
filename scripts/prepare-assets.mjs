// Optional local-only asset mirror. Never uploads images or writes assets to git.
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { manifest } from '../src/recognition/manifest.ts';
const root = resolve('public/recognition');
async function download(url, path, hash, size) {
  const target = resolve(root, path);
  if (!target.startsWith(root + '/')) throw new Error('Unsafe target');
  const verify = bytes => {
    if (size && bytes.length !== size) throw new Error(`Size mismatch: ${path}`);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (hash && digest !== hash.replace('sha256:', '')) throw new Error(`SHA-256 mismatch: ${path}`);
    return digest;
  };
  try { const bytes = await readFile(target); verify(bytes); console.log(`Verified existing ${path}`); return; } catch {}
  console.log(`Download ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer()); const digest = verify(bytes);
  await mkdir(dirname(target), { recursive: true }); await writeFile(target + '.partial', bytes); await rename(target + '.partial', target);
  console.log(`${path}: ${bytes.length} bytes sha256:${digest}`);
}
try {
  for (const [key, url] of Object.entries(manifest.models)) await download(url, `assets/models/${key === 'milo' ? 'milo' : 'detector'}.onnx`, manifest.model_hashes[key], manifest.model_sizes[key]);
  const feed = JSON.parse(await readFile(resolve(root, 'catalog-feed-v2.json'), 'utf8'));
  const catalog = feed.families.milo1.catalogs['scryfall/mtg'];
  for (const entry of [catalog.base, ...Object.values(catalog.updates)]) for (const asset of Object.values(entry.assets)) await download(asset.url, 'assets/catalog/' + asset.url.split('/catalog-v2/')[1], asset.sha256, asset.size);
  for (const name of ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) await download(`https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/${name}`, `vendor/${name}`);
  await download('https://raw.githubusercontent.com/microsoft/onnxruntime/v1.24.3/LICENSE', 'vendor/LICENSE', '2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c');
  await download('https://raw.githubusercontent.com/microsoft/onnxruntime/v1.24.3/ThirdPartyNotices.txt', 'vendor/ThirdPartyNotices.txt', '0e07b95f3a8d6230037707c5c4a2b554d12c4cb67369669ac255635528ffcee2');
  console.log('Ready. Use http://127.0.0.1:4187/?localAssets (npm run dev -- --port 4187 --strictPort). Runtime URLs are version-pinned; emitted hashes are evidence, not pre-known verification.');
} catch (error) { console.error('Local asset preparation failed:', error.message, error.cause?.code ?? ''); process.exitCode = 1; }
