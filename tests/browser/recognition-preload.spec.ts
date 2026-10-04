import { test, expect, type Page } from '@playwright/test';
// SYNTHETIC Worker and canvas stream: lifecycle evidence, not real recognition.
async function install(page: Page) {
  await page.addInitScript(() => {
    const probe = { inits: 0, cameras: 0, frames: 0, workers: [] as SyntheticWorker[] };
    class SyntheticWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      postMessage(data: { type: string; bitmap?: ImageBitmap }) {
        if (data.type === 'init') probe.inits++;
        if (data.type === 'frame') {
          probe.frames++; data.bitmap?.close();
          setTimeout(() => this.reply({ type: 'result', cardPresent: false }), 0);
        }
      }
      constructor() { probe.workers.push(this); }
      reply(data: unknown) { this.onmessage?.({ data }); }
      terminate() {} // Deliberately retain late callbacks to exercise invalidation.
    }
    Object.assign(window, { preloadProbe: probe });
    Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
    navigator.mediaDevices.getUserMedia = async () => {
      probe.cameras++;
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
      return canvas.captureStream(5);
    };
  });
}
async function probe(page: Page) {
  return page.evaluate(() => {
    const p = (window as any).preloadProbe;
    return { inits: p.inits, cameras: p.cameras, frames: p.frames };
  });
}
test('navigation starts preparation without camera permission or confirmation', async ({ page }) => {
  await install(page); await page.goto('/');
  await expect.poll(async () => (await probe(page)).inits).toBe(1);
  expect((await probe(page)).cameras).toBe(0);
  await expect(page.getByText('認識データを準備中（初回 約45MB＋実行環境）', { exact: true })).toBeVisible();
  await expect(page.locator('video')).toHaveJSProperty('srcObject', null);
  await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('camera joins pending preload and starts inference once it completes', async ({ page }) => {
  await install(page); await page.goto('/');
  await expect.poll(async () => (await probe(page)).inits).toBe(1);
  await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
  await expect.poll(async () => (await probe(page)).cameras).toBe(1);
  // Ring-buffer evidence counts preparation attempts, not just worker construction.
  await page.getByRole('button', { name: '情報・設定', exact: true }).click();
  await page.getByText('端末内の計測ログ', { exact: true }).click();
  await page.getByRole('button', { name: '計測を表示', exact: true }).click();
  const marks = JSON.parse(await page.locator('pre').innerText());
  expect(marks.filter((m: { event: string }) => m.event === 'model-start')).toHaveLength(1);
  await page.evaluate(() => (window as any).preloadProbe.workers[0].reply({ type: 'ready', catalogVersion: 52 }));
  await expect.poll(async () => (await probe(page)).frames).toBeGreaterThan(0);
  expect((await probe(page)).inits).toBe(1);
  await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('failed preload exposes reachable retry without opening camera', async ({ page }) => {
  await install(page); await page.goto('/');
  await expect.poll(async () => (await probe(page)).inits).toBe(1);
  await page.evaluate(() => (window as any).preloadProbe.workers[0].reply({ type: 'error', message: 'SYNTHETIC catalog failure' }));
  await expect(page.getByText(/認識データを準備できません.*SYNTHETIC catalog failure/)).toBeVisible();
  const retry = page.getByRole('button', { name: '認識の準備を再試行', exact: true });
  await expect(retry).toBeVisible(); await retry.click();
  await expect.poll(async () => (await probe(page)).inits).toBe(2);
  await page.evaluate(() => (window as any).preloadProbe.workers[1].reply({ type: 'ready', catalogVersion: 52 }));
  await expect(page.getByText(/端末内認識の準備完了/)).toBeVisible();
  await expect(retry).toBeHidden(); expect((await probe(page)).cameras).toBe(0);
});
test('pagehide invalidates pending preload; explicit restart ignores old completion', async ({ page }) => {
  await install(page); await page.goto('/');
  await expect.poll(async () => (await probe(page)).inits).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
  await expect.poll(async () => (await probe(page)).inits).toBe(2);
  await page.evaluate(() => (window as any).preloadProbe.workers[0].reply({ type: 'ready', catalogVersion: 51 }));
  expect((await probe(page)).frames).toBe(0);
  await expect(page.getByText(/辞書 v51/)).toHaveCount(0);
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await page.evaluate(() => (window as any).preloadProbe.workers[1].reply({ type: 'ready', catalogVersion: 52 }));
  await expect(page.getByText(/端末内認識の準備完了/)).toBeVisible();
  expect((await probe(page)).frames).toBe(0);
  await expect(page.locator('video')).toHaveJSProperty('srcObject', null);
  await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
  await expect.poll(async () => (await probe(page)).frames).toBeGreaterThan(0);
  expect((await probe(page)).inits).toBe(2);
});
test('local image replaces pending preload and ignores its late ready', async ({ page }) => {
  await install(page); await page.goto('/');
  await expect.poll(async () => (await probe(page)).inits).toBe(1);
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 10;
    return canvas.toDataURL().split(',')[1]!;
  });
  await page.getByRole('button', { name: '名前検索', exact: true }).click();
  await page.locator('#local-image').setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect.poll(async () => (await probe(page)).inits).toBe(2);
  await page.evaluate(() => (window as any).preloadProbe.workers[0].reply({ type: 'ready', catalogVersion: 51 }));
  expect((await probe(page)).frames).toBe(0);
  await page.evaluate(() => (window as any).preloadProbe.workers[1].reply({ type: 'ready', catalogVersion: 52 }));
  await expect.poll(async () => (await probe(page)).frames).toBe(1);
  expect((await probe(page)).cameras).toBe(0);
  await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
