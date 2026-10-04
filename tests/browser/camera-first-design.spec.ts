import { openRoute, closeRoute } from './immersive-routes.js';
import { test, expect } from '@playwright/test';
// SYNTHETIC provider/image fixtures; no real recognition or prices.
const card = { id: 'design-synthetic', oracle_id: 'design-oracle', name: 'SYNTHETIC Card', printed_name: '合成テストカード', lang: 'ja', set: 'tst', set_name: 'Synthetic Edition', collector_number: '1', finishes: ['nonfoil', 'foil'], prices: { usd: '1.00', usd_foil: '2.00' }, legalities: {}, oracle_text: 'Synthetic rules', printed_text: '合成の本文', image_uris: { normal: 'https://cards.scryfall.io/normal/design-synthetic.jpg' } };
test('functional neutral camera-first shell has visible actions without automatic permission', async ({ page }, info) => {
  let permissions = 0;
  await page.exposeFunction('permissionRequested', () => permissions++);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => { await (window as unknown as { permissionRequested: () => Promise<void> }).permissionRequested(); throw new DOMException('SYNTHETIC denial', 'NotAllowedError'); } } }); });
  await page.goto('/');
  await expect(page.locator('header')).toHaveText('MTG Scanner情報・設定');
  await expect(page.getByText('この1枚を、もっと知る。')).toHaveCount(0);
  await expect(page.getByText('カードをかざす。知りたいことが見える。')).toHaveCount(0);
  await expect(page.locator('.intro')).toHaveCount(0);
  for (const width of [info.project.name === 'desktop' ? 1280 : 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeInViewport();
    await openRoute(page,'名前検索');
    await expect(page.getByRole('searchbox')).toBeInViewport();
    await expect(page.locator('#local-image')).toBeInViewport();await closeRoute(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(permissions).toBe(0);
  const background = await page.locator('.viewport').evaluate(node => getComputedStyle(node).backgroundColor);
  expect(background).toBe('rgb(25, 27, 32)');
  await page.setViewportSize(info.project.name === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath(`${info.project.name}-initial.png`) });
  await page.route('https://cdn.jsdelivr.net/**', route => route.abort());
  await closeRoute(page); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click();
  await expect(page.locator('.camera-status')).toContainText('カメラの許可がありません');
  await openRoute(page,'名前検索');await expect(page.getByRole('searchbox')).toBeEnabled();
});
test('compact real result sheet and stopped camera retain controls, rules and focus (SYNTHETIC)', async ({ page }, info) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.scryfall.com/**', async route => {
    const u = new URL(route.request().url());
    if (!u.pathname.endsWith('/search')) await pending;
    await route.fulfill({ json: u.pathname.endsWith('/search') ? { data: [card], has_more: false } : card });
  });
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }));
  await page.route('https://cards.scryfall.io/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" fill="#454a60"/><text x="20" y="100" fill="white" font-size="36">SYNTHETIC</text><text x="20" y="160" fill="white" font-size="30">TEST ONLY</text></svg>' }));
  await page.goto('/'); await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('Synthetic'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.locator('.search-results button').click();
  await expect(page.locator('.result-heading h2')).toBeInViewport();
  await expect(page.locator('.camera-status')).toContainText('カメラは停止中');
  expect((await page.locator('.viewport').boundingBox())!.height).toBeGreaterThan(0);
  await expect(page.locator('.price')).toHaveText('価格を取得中…');
  await page.screenshot({ path: info.outputPath(`${info.project.name}-loading.png`) });
  await openRoute(page,'確定カード'); await page.getByLabel('加工', { exact: true }).focus(); const y = await page.evaluate(() => scrollY);
  release(); await expect(page.locator('.yen')).toHaveText('概算 ￥150');
  await expect(page.getByLabel('加工', { exact: true })).toBeFocused(); expect(await page.evaluate(() => scrollY)).toBe(y);
  await expect(page.locator('.reference-image img')).toBeVisible();
  await expect(page.locator('.result')).toContainText('1版・言語（全ページ）');
  await expect(page.getByText('合成の本文', { exact: true })).toBeHidden();
  await page.getByText('カード本文・ルール', { exact: true }).click();
  await expect(page.getByText('合成の本文', { exact: true })).toBeVisible();
  await page.getByText('カード本文・ルール', { exact: true }).click();
  for (const width of [info.project.name === 'desktop' ? 1280 : 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByLabel('印刷版', { exact: true })).toBeVisible();
    if (width === 320) await page.screenshot({ path: info.outputPath(`${info.project.name}-narrow320.png`), fullPage: true });
  }
  await page.setViewportSize(info.project.name === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 });
  await openRoute(page,'確定カード');
  await page.getByRole('button', { name: '次のカードをスキャン', exact: true }).scrollIntoViewIfNeeded();await expect(page.getByRole('button', { name: '次のカードをスキャン', exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath(`${info.project.name}-result.png`) });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath(`${info.project.name}-result-overview.png`), fullPage: true });
});
