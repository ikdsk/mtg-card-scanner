import { test, expect } from '@playwright/test';
// All provider responses are SYNTHETIC. No live card/recognition evidence.
const card = { id: 'format-first', oracle_id: 'format-oracle', name: 'Synthetic Formats', lang: 'en', set: 'tst', set_name: 'Synthetic Set', collector_number: '1', finishes: ['nonfoil'], prices: { usd: '0.00' }, legalities: { standard: 'legal', pioneer: 'banned', modern: 'not_legal', vintage: 'restricted', commander: 'unrecognized' } };
const second = { ...card, id: 'format-second', collector_number: '2', legalities: { modern: 'legal' } };
test.beforeEach(async ({ page }) => {
  await page.route('https://api.scryfall.com/**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: url.pathname.endsWith('/search') ? { data: url.searchParams.get('q')?.startsWith('oracleid:') ? [card, second] : [card], has_more: false } : url.pathname.endsWith(second.id) ? second : card });
  });
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }));
});
async function open(page: import('@playwright/test').Page) {
  await page.goto('/'); await page.getByRole('searchbox').fill('Synthetic'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.getByRole('button', { name: /Synthetic Formats.*#1/ }).click();
}
test('icon order, all statuses, tap/keyboard disclosure and fresh card reset', async ({ page }, info) => {
  await open(page);
  const icons = page.locator('.format-icons button');
  await expect(icons).toHaveCount(7);
  expect(await icons.evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.format))).toEqual(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper']);
  expect(await icons.evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.status))).toEqual(['legal', 'banned', 'not_legal', 'unknown', 'restricted', 'unknown', 'unknown']);
  await expect(icons.nth(0)).toHaveAccessibleName(/Standard.*使用可/);
  await icons.nth(4).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.format-disclosure')).toContainText('1枚まで');
  await icons.nth(1).click(); await expect(page.locator('.format-disclosure')).toContainText('Pioneer（パイオニア）：禁止');
  await icons.nth(6).focus(); await page.keyboard.press('Space'); await expect(page.locator('.format-disclosure')).toContainText('使用可否不明');
  if (info.project.name === 'mobile-viewport') {
    await page.locator('.format-legality').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/Users/dikeda/workspace/mtg-card-scanner-research/combined-camera-ui/synthetic-mobile.png', fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(2);
  await page.getByLabel('印刷版', { exact: true }).selectOption(second.id);
  await expect(icons.nth(0)).toHaveAttribute('data-status', 'unknown');
  await expect(icons.nth(2)).toHaveAttribute('data-status', 'legal');
  await expect(page.locator('.format-disclosure')).toBeHidden();
  await page.getByLabel('印刷版', { exact: true }).selectOption(card.id);
  await page.getByLabel('印刷版', { exact: true }).selectOption(second.id);
  await expect(icons.nth(0)).toHaveAttribute('data-status', 'unknown');
});
test('JPY is primary with approximation, USD secondary and zero retained', async ({ page }) => {
  await open(page);
  await expect(page.locator('.price')).toHaveText('概算 ￥0');
  await expect(page.locator('.usd')).toHaveText('$0.00 USD');
  expect(await page.locator('.price-box').evaluate(box => [...box.children].findIndex(node => node.classList.contains('price')) < [...box.children].findIndex(node => node.classList.contains('usd')))).toBe(true);
  const primary = await page.locator('.price').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  const secondary = await page.locator('.usd').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
  expect(primary).toBeGreaterThan(secondary);
});
test('late FX preserves badge disclosure, focused control, input and scroll', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.frankfurter.dev/**', async route => { await pending; await route.fulfill({ json: { date: '2026-10-02', base: 'USD', quote: 'JPY', rate: 150 } }); });
  await open(page); await expect(page.locator('.usd')).toHaveText('$0.00 USD');
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(2);
  const badge = page.locator('[data-format="vintage"]'); await badge.click();
  await page.evaluate(() => scrollTo(0, 0)); release();
  await expect(page.locator('.price')).toHaveText('概算 ￥0');
  await expect(badge).toBeFocused(); await expect(badge).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.format-disclosure')).toContainText('1枚まで');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page.getByRole('searchbox')).toHaveValue('Synthetic');
});
test('null reference price has no fabricated USD or JPY', async ({ page }) => {
  await page.route('https://api.scryfall.com/cards/format-first', route => route.fulfill({ json: { ...card, prices: { usd: null } } }));
  await open(page); await expect(page.locator('.price')).toHaveText('この版・言語・加工の価格なし');
  await expect(page.locator('.usd')).toHaveCount(0); await expect(page.locator('.yen')).toHaveCount(0);
});
