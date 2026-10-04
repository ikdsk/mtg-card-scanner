import { openRoute, closeRoute } from './immersive-routes.js';
import { test, expect, type Page } from '@playwright/test';
// SYNTHETIC worker, input pixels, metadata and provider responses. No recognition accuracy evidence.
const imageUrl = 'https://cards.scryfall.io/small/front/a/a/synthetic.jpg';
const a = { id: 'history-a', oracle_id: 'oracle-a', name: 'Synthetic Alpha', lang: 'en', set: 'tst', set_name: 'Synthetic Set', collector_number: '1', finishes: ['nonfoil', 'foil'], prices: { usd: '1.00', usd_foil: '2.00' }, legalities: { standard: 'legal', pioneer: 'banned', modern: 'not_legal', vintage: 'restricted' }, image_uris: { small: imageUrl, normal: imageUrl } };
const edition = { ...a, id: 'history-edition', lang: 'ja', printed_name: '合成アルファ', set: 'alt', collector_number: '2', prices: { usd: '3.00', usd_foil: '4.00' }, legalities: { standard: 'banned', modern: 'legal' }, image_uris: { normal: 'https://cards.scryfall.io/normal/edition.jpg' } };
const b = { ...a, id: 'history-b', oracle_id: 'oracle-b', name: 'Synthetic Beta', image_uris: undefined, card_faces: [{ name: 'Synthetic Front', image_uris: { normal: 'https://cards.scryfall.io/normal/front.jpg' } }, { name: 'Synthetic Back', image_uris: { normal: 'https://cards.scryfall.io/normal/back.jpg' } }], prices: { usd: '5.00', usd_foil: '6.00' }, legalities: { vintage: 'restricted' } };
async function scan(page: Page, id: string, confirm = true) {
  await page.evaluate(id => { (window as unknown as { syntheticId: string }).syntheticId = id; }, id);
  const image = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 2; return c.toDataURL().split(',')[1]!; });
  await page.locator('#local-image').setInputFiles({ name: 'SYNTHETIC.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  if(confirm){await expect(page.locator('.tentative')).toBeVisible();await expect(page.locator('.tentative')).toContainText(id === 'history-b' ? '英語：Synthetic Beta' : '英語：Synthetic Alpha');await closeRoute(page); await page.getByRole('button',{name:'これです',exact:true}).click();}
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class SyntheticWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      postMessage(data: { type: string }) {
        const reply = data.type === 'init' ? { type: 'ready', catalogVersion: 52 } : { type: 'result', cardId: (window as unknown as { syntheticId: string }).syntheticId, cardPresent: true, cornersValid: true, score: .95, margin: .1 };
        setTimeout(() => this.onmessage?.({ data: reply }), 10);
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => { throw new DOMException('SYNTHETIC denied', 'NotAllowedError'); } } });
  });
  await page.route('https://api.scryfall.com/**', route => {
    const url = new URL(route.request().url());
    const cards = [a, edition, b];
    const body = url.pathname.endsWith('/search') ? { data: url.searchParams.get('q')?.includes('oracle-b') ? [b] : [a, edition], has_more: false } : cards.find(c => url.pathname.endsWith('/' + c.id));
    return route.fulfill({ json: body });
  });
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }));
  await page.route('https://cards.scryfall.io/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" fill="#444"/><text x="20" y="100" fill="white" font-size="32">SYNTHETIC</text></svg>' }));
});

test('combined accepted scan, physical override, older reopen and all widgets (SYNTHETIC)', async ({ page }, info) => {
  await page.goto('/');
  for (const width of [info.project.name === 'desktop' ? 1280 : 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await openRoute(page,'名前検索');await expect(page.getByRole('searchbox')).toBeInViewport();
    await expect(page.locator('#local-image')).toBeInViewport();await closeRoute(page);
    await page.screenshot({ path: info.outputPath(`combined-${info.project.name}-${width}-initial.png`) });
  }
  await page.setViewportSize(info.project.name === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 });
  await scan(page, a.id); await expect(page.locator('.price')).toHaveText('概算 ￥150');
  await expect(page.getByLabel('選択版の言語').locator('option')).toHaveCount(2);
  await openRoute(page,'確定カード'); await page.getByLabel('加工', { exact: true }).selectOption('foil');
  await openRoute(page,'確定カード'); await page.getByLabel('選択版の言語').selectOption('ja');
  await expect(page.locator('.price')).toHaveText('概算 ￥600');
  await expect(page.locator('.usd')).toHaveText('$4.00 USD');
  await expect(page.locator('[data-format="standard"]')).toHaveAttribute('data-status', 'banned');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', edition.image_uris.normal);
  await expect(page.locator('.scan-history-row')).toContainText('ja · Foil');
  await expect(page.locator('.scan-history-row')).toHaveCount(1);
  // Visually distinguish the two unusable statuses, as well as their accessible labels.
  await openRoute(page,'確定カード'); await page.getByLabel('選択版の言語').selectOption('en');
  await expect(page.locator('[data-format="pioneer"] .format-mark')).toHaveText('×');
  await expect(page.locator('[data-format="modern"] .format-mark')).toHaveText('–');
  await openRoute(page,'確定カード'); await page.getByLabel('選択版の言語').selectOption('ja');
  await scan(page, b.id); await expect(page.locator('.scan-history-row')).toHaveCount(2);
  await expect(page.locator('.price')).toHaveText('概算 ￥750');
  await openRoute(page,'履歴'); await page.locator('.scan-history-row').nth(1).click();
  await expect(page.locator('.target')).toContainText('ALT #2 · ja · Foil');
  await expect(page.locator('.price')).toHaveText('概算 ￥600');
  await expect(page.locator('.usd')).toHaveText('$4.00 USD');
  await expect(page.locator('[data-format="modern"]')).toHaveAttribute('data-status', 'legal');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', edition.image_uris.normal);
  await expect(page.locator('.scan-history-row')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeDisabled();
  expect(await page.locator('.result').evaluate(node => node.children[1]?.classList.contains('format-legality'))).toBe(true);
  for (const width of [info.project.name === 'desktop' ? 1280 : 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await openRoute(page,'確定カード');
    await expect(page.locator('.format-icons')).toBeInViewport();
    await page.getByRole('button', { name: '次のカードをスキャン', exact: true }).scrollIntoViewIfNeeded();await expect(page.getByRole('button', { name: '次のカードをスキャン', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`combined-${info.project.name}-${width}-result.png`) });
    await openRoute(page,'履歴');
    expect(await page.locator('.scan-history-list').evaluate(node => getComputedStyle(node.closest('.drawer-body')!).overflowY)).toBe('auto');
    await page.screenshot({ path: info.outputPath(`combined-${info.project.name}-${width}-history.png`), fullPage: true });
  }
});
test('new scan and late FX keep DFC face, format disclosure, focus and scroll (SYNTHETIC)', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.frankfurter.dev/**', async route => { await pending; await route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }).catch(() => {}); });
  await page.goto('/'); await scan(page, a.id); await expect(page.locator('.usd')).toHaveText('$1.00 USD');
  await scan(page, b.id); await expect(page.locator('.usd')).toHaveText('$5.00 USD');
  await expect(page.locator('.result')).toContainText('1版・言語（全ページ）');
  await openRoute(page,'確定カード');await page.getByRole('button', { name: /Synthetic Back/ }).click();
  const badge = page.locator('[data-format="vintage"]'); await badge.click();
  const y = await page.locator('.drawer-body').evaluate(node => node.scrollTop); release();
  await expect(page.locator('.price')).toHaveText('概算 ￥750');
  await expect(page.locator('.reference-image img')).toHaveAttribute('src', 'https://cards.scryfall.io/normal/back.jpg');
  await expect(badge).toBeFocused(); await expect(badge).toHaveAttribute('aria-expanded', 'true');
  expect(await page.locator('.drawer-body').evaluate(node => node.scrollTop)).toBe(y);expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.locator('.scan-history-row')).toHaveCount(2);
  await expect(page.locator('.scan-history-row').first()).toContainText('Synthetic Beta');
});
test('late FX preserves focused rules disclosure and its open state (SYNTHETIC)', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.frankfurter.dev/**', async route => { await pending; await route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }); });
  await page.goto('/'); await scan(page, a.id); await expect(page.locator('.usd')).toHaveText('$1.00 USD');
  await expect(page.getByLabel('選択版の言語').locator('option')).toHaveCount(2);
  await openRoute(page,'確定カード');const summary = page.locator('.card-rules summary'); await summary.click(); await summary.focus();
  const y = await page.locator('.drawer-body').evaluate(node => node.scrollTop); release();
  await expect(page.locator('.price')).toHaveText('概算 ￥150');
  await expect(summary).toBeFocused();
  await expect(page.locator('.card-rules')).toHaveJSProperty('open', true);
  expect(await page.locator('.drawer-body').evaluate(node => node.scrollTop)).toBe(y);expect(await page.evaluate(() => scrollY)).toBe(0);
});
