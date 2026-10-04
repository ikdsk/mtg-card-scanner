import { test, expect } from '@playwright/test';
// All card data, images and responses are explicitly SYNTHETIC.
const image = (id: string) => ({ normal: `https://cards.scryfall.io/normal/front/${id}.jpg` });
const base = { id: 'image-en', oracle_id: 'image-oracle', name: 'Synthetic Bolt', lang: 'en', set: 'tst', set_name: 'Synthetic Edition', collector_number: '1', finishes: ['nonfoil', 'foil'], prices: { usd: '1.00', usd_foil: '2.00' }, legalities: {}, image_uris: image('en'), scryfall_uri: 'https://scryfall.com/card/tst/1/en' };
const ja = { ...base, id: 'image-ja', lang: 'ja', printed_name: '合成の稲妻', image_uris: image('ja') };
const dfc = { ...base, id: 'image-dfc', collector_number: '2', name: 'Synthetic Front // Back', image_uris: undefined, card_faces: [{ name: 'Synthetic Front', image_uris: image('front') }, { name: 'Synthetic Back', image_uris: image('back') }] };
const missing = { ...base, id: 'image-none', collector_number: '3', name: 'Synthetic Missing', image_uris: undefined };
const failed = { ...base, id: 'image-error', collector_number: '4', name: 'Synthetic Failed', image_uris: image('error') };
const cards = [base, ja, dfc, missing, failed];
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" fill="#244d42"/><text x="30" y="90" fill="white" font-size="32">SYNTHETIC reference</text><rect x="30" y="130" width="428" height="300" fill="#a4c2b5"/><text x="30" y="610" fill="white" font-size="22">Browser fixture only</text></svg>';
async function open(page: import('@playwright/test').Page) {
  await page.goto('/'); await page.getByRole('searchbox').fill('Synthetic'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Synthetic Bolt.*TST/ }).click();
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(4);
}
test.beforeEach(async ({ page }) => {
  await page.route('https://api.scryfall.com/**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.pathname.endsWith('/search') ? { data: url.searchParams.get('q')?.startsWith('oracleid:') ? cards : [base], has_more: false } : cards.find(c => url.pathname.endsWith('/' + c.id)) ?? base });
  });
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }));
  await page.route('https://cards.scryfall.io/**', route => route.request().url().includes('error.jpg') ? route.abort() : route.fulfill({ contentType: 'image/svg+xml', body: svg }));
});
test('selected physical printing image ignores Japanese text fallback and follows language/edition', async ({ page }) => {
  await open(page);
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('en').normal);
  await expect(page.locator('.reference-image img')).toBeVisible();
  await expect(page.locator('.reference-image')).toContainText('参照画像');
  await expect(page.locator('.reference-image a')).toHaveAttribute('href', base.scryfall_uri);
  await expect(page.locator('.reference-image img')).toHaveAttribute('alt', /Synthetic Bolt/);
  await page.getByLabel('選択版の言語').selectOption('ja');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('ja').normal);
  await page.getByLabel('選択版の言語').selectOption('en');
  await page.getByLabel('印刷版', { exact: true }).selectOption('image-dfc');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('front').normal);
});
test('DFC face remains selected through prices/FX and resets on identity change; missing/error stay usable', async ({ page }) => {
  await open(page); await page.getByLabel('印刷版', { exact: true }).selectOption('image-dfc');
  const back = page.getByRole('button', { name: '裏面：Synthetic Back', exact: true }); await back.click();
  await expect(back).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('加工', { exact: true }).selectOption('foil');
  await expect(page.locator('.price')).toHaveText('$2.00');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('back').normal);
  await page.getByRole('button', { name: '価格・為替を再確認', exact: true }).click();
  await expect(page.locator('.yen')).toHaveText('概算 ￥300');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('back').normal);
  await page.getByLabel('印刷版', { exact: true }).selectOption('image-none');
  await expect(page.locator('.reference-image')).toContainText('この面の参照画像はありません');
  await expect(page.locator('.price')).toHaveText('$2.00');
  await page.getByLabel('印刷版', { exact: true }).selectOption('image-error');
  await expect(page.locator('.reference-image')).toContainText('参照画像を読み込めません');
  await expect(page.locator('.price')).toHaveText('$2.00');
  await page.getByLabel('印刷版', { exact: true }).selectOption('image-dfc');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('front').normal);
  await expect(page.getByRole('button', { name: '表面：Synthetic Front', exact: true })).toHaveAttribute('aria-pressed', 'true');
});
test('delayed image never gates prices or shifts reserved layout/focus/scroll; stale events cannot restore image', async ({ page }, info) => {
  let release!: () => void; const wait = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://cards.scryfall.io/**', async route => { await wait; await route.fulfill({ contentType: 'image/svg+xml', body: svg }); });
  await open(page); await expect(page.locator('.price')).toHaveText('$1.00');
  await expect(page.locator('.yen')).toHaveText('概算 ￥150');
  const before = await page.locator('.reference-region').boundingBox();
  await page.getByLabel('加工', { exact: true }).focus(); await page.evaluate(() => scrollTo(0, 0));
  release(); await expect(page.locator('.reference-image img')).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0); await expect(page.getByLabel('加工', { exact: true })).toBeFocused();
  const after = await page.locator('.reference-region').boundingBox();
  expect(after?.width).toBe(before?.width); expect(after?.height).toBe(before?.height);
  expect(after!.width / after!.height).toBeCloseTo(488 / 680, 2);
  // Retain obsolete element to explicitly dispatch late load/error notifications.
  await page.evaluate(() => { (window as unknown as { oldImage: Element | null }).oldImage = document.querySelector('.reference-image img'); });
  await page.getByLabel('印刷版', { exact: true }).selectOption('image-dfc');
  await page.evaluate(() => { const old = (window as unknown as { oldImage: Element }).oldImage; old.dispatchEvent(new Event('load')); old.dispatchEvent(new Event('error')); });
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('front').normal);
  await expect(page.locator('.reference-image img')).toBeVisible();
  if (info.project.name === 'mobile-viewport') {
    await page.locator('.result').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector('.result')!.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: info.outputPath('synthetic-mobile.png') });
  }
});
test('reversed card responses and next scan cannot restore an old reference (SYNTHETIC)', async ({ page }) => {
  // A search fixture intentionally omits its image so fresh card completion is observable.
  let searches = 0;
  await page.route('https://api.scryfall.com/cards/search**', route => {
    const listing = new URL(route.request().url()).searchParams.get('q')?.startsWith('oracleid:');
    return route.fulfill({ json: { data: listing ? cards : ++searches === 1 ? [{ ...base, image_uris: undefined }] : [dfc], has_more: false } });
  });
  let release!: () => void; const delayed = new Promise<void>(resolve => { release = resolve; });
  let started!: () => void; const requested = new Promise<void>(resolve => { started = resolve; });
  await page.route('https://api.scryfall.com/cards/image-en', async route => { started(); await delayed; await route.fulfill({ json: base }); });
  await page.goto('/'); await page.getByRole('searchbox').fill('Synthetic');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Synthetic Bolt.*TST/ }).click(); await requested;
  // The repository serializes requests. Manual correction aborts the old price
  // request before the next search can run; its delayed route then completes last.
  await page.getByRole('searchbox').fill('Synthetic Front');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Synthetic Front.*TST/ }).click();
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(4);
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('front').normal);
  release(); await expect(page.locator('.price')).toHaveText('$1.00');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', image('front').normal);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('SYNTHETIC denial', 'NotAllowedError'); } } });
    (window as unknown as { obsolete: Element | null }).obsolete = document.querySelector('.reference-image img');
  });
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await page.getByRole('button', { name: '次のカードをスキャン', exact: true }).click();
  await expect(page.locator('.result')).toBeHidden(); await expect(page.locator('.reference-image img')).toHaveCount(0);
  await page.evaluate(() => { const old = (window as unknown as { obsolete: Element }).obsolete; old.dispatchEvent(new Event('load')); old.dispatchEvent(new Event('error')); });
  await expect(page.locator('.reference-image img')).toHaveCount(0);
});
test('recognized result shows reference before a delayed image finishes (SYNTHETIC worker/frame)', async ({ page }) => {
  await page.addInitScript(() => {
    class SyntheticWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      postMessage(data: { type: string }) {
        const reply = data.type === 'init' ? { type: 'ready', catalogVersion: 52 } : { type: 'result', cardId: 'image-en', cardPresent: true, cornersValid: true, score: .95, margin: .1 };
        setTimeout(() => this.onmessage?.({ data: reply }), 20);
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
  });
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://cards.scryfall.io/**', async route => { await pending; await route.fulfill({ contentType: 'image/svg+xml', body: svg }); });
  await page.goto('/');
  const bytes = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2; return canvas.toDataURL().split(',')[1]!; });
  await page.locator('#local-image').setInputFiles({ name: 'SYNTHETIC-frame.png', mimeType: 'image/png', buffer: Buffer.from(bytes, 'base64') });
  await expect(page.locator('.result h2')).toBeInViewport();
  await expect(page.locator('.reference-image')).toContainText('参照画像を読み込み中');
  await expect(page.locator('.price')).toHaveText('$1.00');
  release(); await expect(page.locator('.reference-image img')).toBeVisible();
});
test('late FX update keeps back face, image DOM, focus and scroll (SYNTHETIC)', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.frankfurter.dev/**', async route => { await pending; await route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }); });
  await open(page); await page.getByLabel('印刷版', { exact: true }).selectOption('image-dfc');
  await page.getByRole('button', { name: '裏面：Synthetic Back', exact: true }).click();
  await expect(page.locator('.price')).toHaveText('$1.00');
  await expect(page.locator('.reference-image img')).toBeVisible();
  await page.evaluate(() => { (window as unknown as { retained: Element | null }).retained = document.querySelector('.reference-image img'); scrollTo(0, 0); });
  release(); await expect(page.locator('.yen')).toHaveText('概算 ￥150');
  await expect(page.getByRole('button', { name: '裏面：Synthetic Back', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: '裏面：Synthetic Back', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as unknown as { retained: Element }).retained === document.querySelector('.reference-image img'))).toBe(true);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
