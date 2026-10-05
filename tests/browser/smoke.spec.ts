import { openRoute, closeRoute } from './immersive-routes.js';
import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// Entire provider network in these tests is SYNTHETIC. No live evidence.
const sheet = (page: Page) => page.getByRole('dialog', { name: 'カードの詳細', exact: true });
const base = { id: 'en1', oracle_id: 'oracle1', name: 'Lightning Bolt', lang: 'en', set: 'tst', set_name: 'Synthetic Set', collector_number: '1', finishes: ['nonfoil', 'foil', 'etched'], prices: { usd: '0.00', usd_foil: '2.00', usd_etched: null }, legalities: { modern: 'legal' }, oracle_text: 'Synthetic English rules', type_line: 'Instant', mana_cost: '{R}' };
const ja = { ...base, id: 'ja1', lang: 'ja', printed_name: '稲妻', printed_text: '合成の日本語印刷本文', prices: { usd: null, usd_foil: null, usd_etched: null } };
const edition = { ...base, id: 'en2', set: 'alt', set_name: 'Synthetic Alternate', collector_number: '2', prices: { usd: '3.00', usd_foil: '4.00', usd_etched: null } };
test.beforeEach(async ({ page, context }) => {
  // Optional no-listen mode serves the real built app inside Playwright's route
  // handler. It changes transport only; provider fixtures remain SYNTHETIC.
  if (process.env.PLAYWRIGHT_NO_SERVER) await context.route(`http://127.0.0.1:${process.env.MVP_PORT ?? 4187}/**`, async route => {
    const path = new URL(route.request().url()).pathname;
    const target = resolve('dist', path === '/' ? 'index.html' : '.' + path);
    if (!target.startsWith(resolve('dist') + '/')) return route.abort();
    try {
      const body = await readFile(target); const contentType = target.endsWith('.js') || target.endsWith('.mjs') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : target.endsWith('.json') ? 'application/json' : 'text/html';
      await route.fulfill({ body, contentType });
    } catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await page.route('https://api.scryfall.com/**', async route => {
    const u = new URL(route.request().url());
    let body: unknown = base;
    if (u.pathname.endsWith('/search')) body = { data: u.searchParams.get('q')?.startsWith('oracleid:') ? [base, ja, edition] : [base], has_more: false };
    else if (u.pathname.endsWith('/ja1')) body = ja;
    else if (u.pathname.endsWith('/en2')) body = edition;
    await route.fulfill({ json: body });
  });
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }));
});
test('manual JP/EN search opens the read-only sheet with Japanese display, exact printing price and null/zero', async ({ page }) => {
  await page.goto('/'); await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('稲妻'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  const detail = sheet(page); await expect(detail).toBeVisible(); await expect(page.locator('.utility-drawer')).toBeHidden();
  await expect(detail.locator('.candidate-name')).toHaveText('稲妻'); await expect(detail.locator('.candidate-english')).toHaveText('Lightning Bolt');
  await expect(detail.locator('.usd')).toHaveText('$0.00 USD'); await expect(detail.locator('.price')).toHaveText('参考価格 ￥0');
  await detail.getByRole('button', { name: /Synthetic Alternate/ }).click();
  await expect(detail.locator('.usd')).toHaveText('$3.00 USD'); await expect(detail).toContainText('Synthetic Alternate (ALT) #2 · en · nonfoil');
  await detail.getByRole('button', { name: /Synthetic Set \(TST\) #1 · ja/ }).click();
  await expect(detail.locator('.price')).toHaveText('この版・言語・加工の価格なし'); await expect(detail).toContainText('Synthetic Set (TST) #1 · ja · nonfoil');
  await expect(detail.locator('.candidate-rules')).toContainText('合成の日本語印刷本文'); await expect(detail.locator('.candidate-rules')).toContainText('Synthetic English rules');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
});
test('camera permission denial leaves manual search usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } });
  });
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.goto('/'); await closeRoute(page); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click();
  await expect(page.getByText(/カメラの許可がありません/)).toBeVisible();
  await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('Lightning Bolt'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await expect(page.getByRole('button', { name: /Lightning Bolt.*TST/ })).toBeVisible();
});
test('FX error keeps USD and no invented yen', async ({ page }) => {
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ status: 503, json: { error: 'SYNTHETIC' } }));
  await page.goto('/'); await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('Bolt'); await page.getByRole('button', { name: '検索', exact: true }).click(); await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  const detail = sheet(page);
  await expect(detail.locator('.usd')).toHaveText('$0.00 USD'); await expect(detail.getByText('為替を取得できません。USDのみ表示します。')).toBeVisible(); await expect(detail.getByText(/参考価格 ￥/)).toHaveCount(0); await expect(detail.locator('.price')).toHaveText('概算JPYは利用できません');
});

test('worker retains init sent while runtime module import is pending (SYNTHETIC runtime)', async ({ page, context }) => {
  await context.route('**/recognition/vendor/ort.webgpu.min.mjs', route => route.fulfill({ contentType: 'text/javascript', body: 'await new Promise(resolve => setTimeout(resolve, 200)); export const env = { wasm: {} };' }));
  await page.goto('/');
  const messages = await page.evaluate(() => new Promise<string[]>(resolve => {
    const worker = new Worker('/recognition/scanner.worker.mjs?local', { type: 'module' });
    const seen: string[] = [];
    const timer = setTimeout(() => { worker.terminate(); resolve(seen); }, 3000);
    worker.onmessage = ({ data }) => {
      seen.push(data.type);
      if (data.type === 'error') { clearTimeout(timer); worker.terminate(); resolve(seen); }
    };
    worker.postMessage({ type: 'init', manifest: { models: { detector: 'unused' }, detector: { input_size: -1 } } });
  }));
  expect(messages).toContain('progress');
  expect(messages).toContain('error'); // Invalid fixture manifest must reach validation.
});

test('manual correction search discards a delayed recognition card response (SYNTHETIC)', async ({ page }) => {
  await page.addInitScript(() => {
    class SyntheticWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      postMessage(data: { type: string }) {
        const reply = data.type === 'init' ? { type: 'ready', catalogVersion: 52 } : { type: 'result', cardId: 'en1', cardPresent: true, cornersValid: true, score: .95, margin: .1 };
        setTimeout(() => this.onmessage?.({ data: reply }), 0);
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
  });
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  let delivered!: () => void;
  const delivery = new Promise<void>(resolve => { delivered = resolve; });
  await page.route('https://api.scryfall.com/cards/en1', async route => {
    await delayed;
    await route.fulfill({ json: base }).catch(() => {});
    delivered();
  });
  await page.goto('/');
  const requested = page.waitForRequest('https://api.scryfall.com/cards/en1');
  const image = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2; return canvas.toDataURL().split(',')[1]!; });
  await page.locator('#local-image').setInputFiles({ name: 'SYNTHETIC.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await requested;
  await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('訂正検索');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  release(); await delivery;
  await expect(page.locator('.search-results button')).toHaveCount(1);
  await page.waitForTimeout(200); // Deliver/handle the explicitly controlled late response.
  await expect(page.locator('.tentative')).toBeHidden(); await expect(sheet(page)).toBeHidden();
});

test('manual result sheet enters the viewport once; delayed FX preserves scroll, focus and the search input (SYNTHETIC)', async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.frankfurter.dev/**', async route => { await delayed; await route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }); });
  await page.goto('/');
  await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('Bolt');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  const detail = sheet(page); await expect(detail).toBeInViewport(); await expect(detail.locator('.price')).toHaveText('概算JPYは利用できません');
  await expect(detail.locator('.printing-item')).toHaveCount(3);
  const close = page.getByRole('button', { name: '閉じる', exact: true }); await expect(close).toBeFocused();
  const body = page.locator('.detail-sheet-body'); await body.evaluate(node => { node.scrollTop = 10; });
  const before = await body.evaluate(node => node.scrollTop); const y = await page.evaluate(() => scrollY);
  release();
  await expect(detail.locator('.price')).toHaveText('参考価格 ￥0');
  expect(await body.evaluate(node => node.scrollTop)).toBe(before); expect(await page.evaluate(() => scrollY)).toBe(y); await expect(close).toBeFocused();
  await close.click(); await expect(detail).toBeHidden();
  await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeInViewport();
  await openRoute(page,'名前検索'); await expect(page.locator('.search-form input')).toHaveValue('Bolt');
});

test('recognized candidate requires confirmation; history entry can be deliberately viewed in the sheet (SYNTHETIC worker/image)', async ({ page }) => {
  await page.addInitScript(() => {
    class SyntheticWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      postMessage(data: { type: string }) {
        const reply = data.type === 'init' ? { type: 'ready', catalogVersion: 52 } : { type: 'result', cardId: 'en1', cardPresent: true, cornersValid: true, score: .95, margin: .1 };
        setTimeout(() => this.onmessage?.({ data: reply }), 30);
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
  });
  await page.goto('/');
  const image = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 2; return c.toDataURL().split(',')[1]!; });
  await page.locator('#local-image').setInputFiles({ name: 'SYNTHETIC.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await expect(page.locator('.tentative')).toContainText('Lightning Bolt');await expect(page.locator('.scan-history-row')).toHaveCount(0);await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();
  await openRoute(page,'履歴'); await page.locator('.scan-history-row').click();
  await expect(sheet(page)).toBeInViewport(); await expect(sheet(page).locator('.candidate-name')).toBeInViewport();
  await expect(page.getByRole('button', { name: '閉じる', exact: true })).toBeInViewport();
});

test('late printing list keeps the sheet position and focus (SYNTHETIC)', async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.scryfall.com/cards/search**', async route => {
    const listing = new URL(route.request().url()).searchParams.get('q')?.startsWith('oracleid:');
    if (listing) await delayed;
    await route.fulfill({ json: { data: listing ? [base, ja, edition] : [base], has_more: false } });
  });
  await page.goto('/'); await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('Bolt');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  const detail = sheet(page); await expect(detail.locator('.usd')).toHaveText('$0.00 USD'); await expect(detail).toContainText('版の一覧を取得中…');
  const close = page.getByRole('button', { name: '閉じる', exact: true }); await expect(close).toBeFocused();
  const body = page.locator('.detail-sheet-body'); await body.evaluate(node => { node.scrollTop = 0; });
  release();
  await expect(detail.locator('.printing-item')).toHaveCount(3);
  expect(await page.evaluate(() => scrollY)).toBe(0); await expect(close).toBeFocused();
  await expect(detail.locator('.candidate-name')).toHaveText('稲妻');
  await expect(detail.locator('.usd')).toHaveText('$0.00 USD'); await expect(detail.locator('.price')).toHaveText('参考価格 ￥0');
});
