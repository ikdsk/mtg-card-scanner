import { test, expect } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// SYNTHETIC compressed transport payload; no recognition assets required.
test('catalog transport preserves compressed bytes for SHA-256 verification', async ({ page }, info) => {
  const name = `transport-${info.project.name}.json.gz`;
  const path = `dist/recognition/assets/${name}`;
  const compressed = gzipSync('synthetic catalog transport regression');
  await mkdir('dist/recognition/assets', { recursive: true });
  await writeFile(path, compressed);
  try {
    await page.goto('/');
    const received = await page.evaluate(async name => {
      const response = await fetch(`/recognition/assets/${name}`);
      const bytes = await response.arrayBuffer();
      return { encoding: response.headers.get('content-encoding'), size: bytes.byteLength, hash: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('') };
    }, name);
    expect(received.size).toBe(compressed.length);
    expect(received.hash).toBe(createHash('sha256').update(compressed).digest('hex'));
    expect(received.encoding).toBeNull();
  } finally { await rm(path); }
});
