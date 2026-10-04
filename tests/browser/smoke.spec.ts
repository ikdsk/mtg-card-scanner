import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
// Entire provider network in these tests is SYNTHETIC. No live evidence.
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
test('manual JP/EN search, Japanese display, exact edition/language/finish and null/zero', async ({ page }) => {
  await page.goto('/'); await page.getByRole('searchbox').fill('稲妻'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  await expect(page.getByRole('heading', { name: '稲妻', exact: true, level: 2 })).toBeVisible();
  await expect(page.locator('.usd')).toHaveText('$0.00 USD'); await expect(page.locator('.yen')).toHaveText('概算 ￥0');
  await page.getByLabel('加工', { exact: true }).selectOption('foil'); await expect(page.locator('.usd')).toHaveText('$2.00 USD');
  await page.getByLabel('印刷版', { exact: true }).selectOption('en2'); await expect(page.locator('.usd')).toHaveText('$4.00 USD'); await expect(page.locator('.target')).toContainText('ALT #2 · en · Foil');
  await page.getByLabel('選択版の言語').selectOption('ja'); await expect(page.locator('.price')).toHaveText('この版・言語・加工の価格なし'); await expect(page.locator('.target')).toContainText('ja · Foil');
  await page.getByText('カード本文・ルール', { exact: true }).click();
  await expect(page.getByText('合成の日本語印刷本文')).toBeVisible(); await expect(page.getByText('Synthetic English rules')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
});
test('camera permission denial leaves manual search usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } });
  });
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.goto('/'); await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
  await expect(page.getByText(/カメラの許可がありません/)).toBeVisible();
  await page.getByRole('searchbox').fill('Lightning Bolt'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await expect(page.getByRole('button', { name: /Lightning Bolt.*TST/ })).toBeVisible();
});
test('FX error keeps USD and no invented yen', async ({ page }) => {
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ status: 503, json: { error: 'SYNTHETIC' } }));
  await page.goto('/'); await page.getByRole('searchbox').fill('Bolt'); await page.getByRole('button', { name: '検索', exact: true }).click(); await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  await expect(page.locator('.usd')).toHaveText('$0.00 USD'); await expect(page.getByText('為替を取得できません。USDのみ表示します。')).toBeVisible(); await expect(page.locator('.yen')).toHaveCount(0); await expect(page.locator('.price')).toHaveText('概算JPYは利用できません');
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
  await page.getByRole('searchbox').fill('訂正検索');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  release(); await delivery;
  await expect(page.locator('.search-results button')).toHaveCount(1);
  await page.waitForTimeout(200); // Deliver/handle the explicitly controlled late response.
  await expect(page.locator('.result')).toBeHidden();
});

test('new manual result enters viewport once; delayed updates preserve scroll, focus and input (SYNTHETIC)', async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.frankfurter.dev/**', async route => { await delayed; await route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }); });
  await page.goto('/');
  await page.getByRole('searchbox').fill('Bolt');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  await expect(page.locator('.result h2')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'スキャンに戻る', exact: true })).toBeInViewport();
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(2);
  await page.getByLabel('加工', { exact: true }).selectOption('foil');
  await expect(page.locator('.usd')).toHaveText('$2.00 USD');
  await page.getByLabel('加工', { exact: true }).focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  const before = await page.evaluate(() => scrollY);
  release();
  await expect(page.locator('.yen')).toHaveText('概算 ￥300');
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(page.getByLabel('加工', { exact: true })).toBeFocused();
  await expect(page.getByLabel('加工', { exact: true })).toHaveValue('foil');
  await expect(page.getByRole('searchbox')).toHaveValue('Bolt');
  await page.getByRole('button', { name: 'スキャンに戻る', exact: true }).click();
  await expect(page.getByRole('button', { name: 'カメラでスキャン', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'カメラでスキャン', exact: true })).toBeFocused();
});

test('recognized result heading and return action enter viewport from scan position (SYNTHETIC worker/image)', async ({ page }) => {
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
  await page.evaluate(() => scrollTo(0, 0));
  await expect(page.locator('.result h2')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'スキャンに戻る', exact: true })).toBeInViewport();
});

test('printing-list and price refresh rerenders keep user position and focus (SYNTHETIC)', async ({ page }) => {
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.scryfall.com/cards/search**', async route => {
    const listing = new URL(route.request().url()).searchParams.get('q')?.startsWith('oracleid:');
    if (listing) await delayed;
    await route.fulfill({ json: { data: listing ? [base, ja, edition] : [base], has_more: false } });
  });
  await page.goto('/'); await page.getByRole('searchbox').fill('Bolt');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Lightning Bolt.*TST/ }).click();
  await expect(page.locator('.usd')).toHaveText('$0.00 USD');
  await page.getByLabel('加工', { exact: true }).focus();
  await page.evaluate(() => scrollTo(0, 0));
  release();
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(2);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.getByLabel('加工', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: '価格・為替を再確認', exact: true }).click();
  const position = await page.evaluate(() => scrollY);
  await expect(page.locator('.usd')).toHaveText('$0.00 USD');
  await expect(page.locator('.yen')).toHaveText('概算 ￥0');
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await expect(page.getByRole('button', { name: '価格・為替を再確認', exact: true })).toBeFocused();
});
