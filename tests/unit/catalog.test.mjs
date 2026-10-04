import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { BrowserCatalogV2, CatalogV2FeedClient } from '../../public/recognition/lib/collectorvision-catalog-v2.mjs';

// SYNTHETIC compatible cached snapshot and failed update; no model execution.
async function fixture() {
  const feed = JSON.parse(await readFile(new URL('../../public/recognition/catalog-feed-v2.json', import.meta.url)));
  const family = feed.families.milo1;
  const catalog = family.catalogs['scryfall/mtg'];
  catalog.rows = catalog.base.rows = 1;
  for (const update of Object.values(catalog.updates)) {
    update.rows = { added: 0, updated: 1, deleted: 0 };
    update.recognition_rows = 1; update.metadata_rows = 0;
  }
  const previous = new BrowserCatalogV2({ familyKey: 'milo1', catalogKey: 'milo1/scryfall/mtg', publicName: catalog.public_name, descriptor: catalog.descriptor, embedding: family.embedding, version: 51, sourceUpdatedAt: '2026-10-02', records: [{ id: 'SYNTHETIC', name: 'Fixture', identifiers: {}, faceIndex: 0 }], embeddings: new Uint16Array(128), metadataLoaded: false });
  const cache = { get: vi.fn(async version => version === 51 ? previous : null), put: vi.fn(), delete: vi.fn() };
  const fetchImpl = vi.fn(async url => String(url).endsWith('feed.json') ? new Response(JSON.stringify(feed)) : new Response('update unavailable', { status: 503 }));
  return { feed, previous, cache, fetchImpl };
}
it('keeps the last complete compatible catalog active when update fails (SYNTHETIC)', async () => {
  const { previous, cache, fetchImpl } = await fixture();
  const client = new CatalogV2FeedClient({ fetchImpl, feedUrl: 'https://fixture.example/feed.json', cache });
  const result = await client.loadGame('mtg', { includeMetadata: false });
  expect(result.version).toBe(51);
  expect(result.records).toEqual(previous.records);
  expect(result.embeddings).toEqual(previous.embeddings);
  expect(result.updateError).toContain('503');
  expect(cache.put).not.toHaveBeenCalled();
  expect(cache.delete).not.toHaveBeenCalled();
});
it('never falls back to a snapshot from a different embedding model (SYNTHETIC)', async () => {
  const { previous, cache, fetchImpl } = await fixture();
  previous.embedding = { ...previous.embedding, model: 'different-model@sha256:bad' };
  const client = new CatalogV2FeedClient({ fetchImpl, feedUrl: 'https://fixture.example/feed.json', cache });
  await expect(client.loadGame('mtg', { includeMetadata: false })).rejects.toThrow('503');
  expect(cache.put).not.toHaveBeenCalled();
});
it('resumes a failed update, validates complete candidate and persists it atomically (SYNTHETIC)', async () => {
  const { feed, previous, cache } = await fixture();
  const { gzipSync } = await import('node:zlib');
  const { createHash } = await import('node:crypto');
  const record = { id: 'SYNTHETIC', name: 'Updated fixture', identifiers: {} };
  const records = gzipSync(JSON.stringify({ op: 'upsert', record, embedding_index: 0 }) + '\n');
  const embeddings = gzipSync(Buffer.alloc(256));
  const assets = feed.families.milo1.catalogs['scryfall/mtg'].updates['52'].assets;
  for (const [key, bytes] of Object.entries({ records, embeddings })) {
    assets[key].size = bytes.length;
    assets[key].sha256 = createHash('sha256').update(bytes).digest('hex');
  }
  let available = false;
  const fetchImpl = vi.fn(async url => String(url).endsWith('feed.json') ? new Response(JSON.stringify(feed)) : available ? new Response(String(url).includes('records') ? records : embeddings) : new Response('', { status: 503 }));
  const client = new CatalogV2FeedClient({ fetchImpl, feedUrl: 'https://fixture.example/feed.json', cache });
  const fallback = await client.loadGame('mtg', { includeMetadata: false });
  expect(fallback.version).toBe(51); expect(cache.put).not.toHaveBeenCalled();
  available = true;
  const updated = await client.loadGame('mtg', { includeMetadata: false });
  expect(updated.version).toBe(52); expect(updated.updateError).toBeNull();
  expect(updated.records[0].name).toBe('Updated fixture');
  expect(previous.records[0].name).toBe('Fixture');
  expect(cache.put).toHaveBeenCalledExactlyOnceWith(updated);
  expect(cache.delete).toHaveBeenCalledWith(51, 'milo1/scryfall/mtg', false);
});

it('retains v51 after quota failure and a fresh client can use it offline (SYNTHETIC)', async () => {
  const { feed, previous } = await fixture();
  const { gzipSync } = await import('node:zlib');
  const { createHash } = await import('node:crypto');
  const records = gzipSync(JSON.stringify({ op: 'upsert', record: { id: 'SYNTHETIC', name: 'Updated fixture', identifiers: {} }, embedding_index: 0 }) + '\n');
  const embeddings = gzipSync(Buffer.alloc(256));
  const assets = feed.families.milo1.catalogs['scryfall/mtg'].updates['52'].assets;
  for (const [key, bytes] of Object.entries({ records, embeddings })) {
    assets[key].size = bytes.length; assets[key].sha256 = createHash('sha256').update(bytes).digest('hex');
  }
  const stored = new Map([[51, previous]]);
  const cache = { get: async v => stored.get(v) ?? null, put: vi.fn(async () => { throw new DOMException('controlled quota failure', 'QuotaExceededError'); }), delete: vi.fn(async v => { stored.delete(v); }) };
  let offline = false;
  const fetchImpl = async url => String(url).endsWith('feed.json') ? new Response(JSON.stringify(feed)) : offline ? new Response('', { status: 503 }) : new Response(String(url).includes('records') ? records : embeddings);
  const options = { fetchImpl, feedUrl: 'https://fixture.example/feed.json', cache };
  expect((await new CatalogV2FeedClient(options).loadGame('mtg', { includeMetadata: false })).version).toBe(52);
  expect(cache.put).toHaveBeenCalledOnce();
  offline = true;
  const reloaded = await new CatalogV2FeedClient(options).loadGame('mtg', { includeMetadata: false });
  expect(reloaded.version).toBe(51);
  expect(reloaded.records).toEqual(previous.records);
  expect(reloaded.embeddings).toEqual(previous.embeddings);
  expect(reloaded.updateError).toContain('503');
  expect(cache.delete).not.toHaveBeenCalled();
  expect(stored.get(51)).toBe(previous);
});
