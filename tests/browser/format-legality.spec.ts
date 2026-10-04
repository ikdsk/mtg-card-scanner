import { openRoute, closeRoute } from './immersive-routes.js';
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
  await page.goto('/'); await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('Synthetic'); await page.getByRole('button', { name: '検索', exact: true }).click();
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
    await page.screenshot({ path: info.outputPath('synthetic-mobile.png'), fullPage: true });
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(2);
  await openRoute(page,'確定カード'); await page.getByLabel('印刷版', { exact: true }).selectOption(second.id);
  await expect(icons.nth(0)).toHaveAttribute('data-status', 'unknown');
  await expect(icons.nth(2)).toHaveAttribute('data-status', 'legal');
  await expect(page.locator('.format-disclosure')).toBeHidden();
  await openRoute(page,'確定カード'); await page.getByLabel('印刷版', { exact: true }).selectOption(card.id);
  await openRoute(page,'確定カード'); await page.getByLabel('印刷版', { exact: true }).selectOption(second.id);
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
  await expect(page.locator('.search-form input')).toHaveValue('Synthetic');
});
test('null reference price has no fabricated USD or JPY', async ({ page }) => {
  await page.route('https://api.scryfall.com/cards/format-first', route => route.fulfill({ json: { ...card, prices: { usd: null } } }));
  await open(page); await expect(page.locator('.price')).toHaveText('この版・言語・加工の価格なし');
  await expect(page.locator('.usd')).toHaveCount(0); await expect(page.locator('.yen')).toHaveCount(0);
});

for (const width of [320, 390, 1280]) {
  test(`uniform Japanese rectangles at ${width}px across every status`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    // Geometry/keyboard test starts once provider hydration is finished.
    // Late-update behavior is exercised separately; native Space may cancel
    // if the result is detached by a card response between keydown and keyup.
    await expect(page.locator('.result .price')).toHaveText('概算 ￥0');
    await expect(page.getByLabel('印刷版', { exact: true }).locator('option')).toHaveCount(2);
    const badges = page.locator('.format-icons button');
    await expect(badges.locator('.format-badge')).toHaveText(['スタン', 'パイオニア', 'モダン', 'レガシー', 'ヴィンテ', '統率者', 'パウパー']);
    const geometry = await badges.evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect(), style = getComputedStyle(node);
      const label = node.querySelector('.format-badge')!;
      return { width: box.width, height: box.height, radius: parseFloat(style.borderRadius), fits: label.scrollWidth <= label.clientWidth, color: style.color, background: style.backgroundColor };
    }));
    expect(new Set(geometry.map(box => `${box.width}:${box.height}`)).size).toBe(1);
    expect(geometry[0]!.width).toBeGreaterThan(geometry[0]!.height);
    expect(geometry.every(box => box.radius > 0 && box.radius < box.height / 2 && box.fits)).toBe(true);
    expect(geometry[0]!.color).not.toBe(geometry[1]!.color);
    expect(geometry[0]!.background).not.toBe(geometry[1]!.background);
    expect(await page.locator('.drawer-body').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const restricted = badges.nth(4);
    await restricted.focus();
    const scroll = await page.locator('.drawer-body').evaluate(node => node.scrollTop);
    await page.keyboard.press('Enter');
    await expect(restricted).toBeFocused();
    await expect(restricted).toHaveAccessibleName(/制限付き使用可.*1枚まで/);
    await expect(page.locator('.format-disclosure')).toContainText('1枚まで');
    expect(await page.locator('.drawer-body').evaluate(node => node.scrollTop)).toBe(scroll);
    await page.keyboard.press('Space');
    await expect(restricted).toBeFocused();
    await expect(page.locator('.format-disclosure')).toBeHidden();
    await badges.nth(1).click();
    await expect(badges.nth(1)).toBeFocused();
    await expect(badges.nth(1)).toHaveAccessibleName(/禁止/);
    await expect(badges.nth(2)).toHaveAccessibleName(/使用不可/);
    await page.screenshot({ path: testInfo.outputPath(`synthetic-format-${width}.png`), fullPage: true });
  });
}

for (const width of [320, 390, 1280]) {
  test(`candidate reuses uniform format badges at ${width}px (SYNTHETIC)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d')!.fillRect(0, 0, 640, 480);
        return canvas.captureStream(5);
      };
      class SyntheticWorker {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        postMessage(message: { type: string; bitmap?: ImageBitmap }) {
          message.bitmap?.close();
          setTimeout(() => this.onmessage?.({ data: message.type === 'init' ? { type: 'ready', catalogVersion: 52 } : {
            type: 'result', cardId: 'format-first', scryfallOracleId: 'format-oracle', cardPresent: true,
            cornersValid: true, corners: [[.1, .1], [.9, .1], [.9, .9], [.1, .9]], score: .7, margin: .1,
          } }), 10);
        }
        terminate() {}
      }
      Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
    });
    await page.goto('/');
    await closeRoute(page);
    await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
    await expect(page.locator('.tentative')).toContainText('Synthetic Formats');
    await page.getByRole('button', { name: '候補パネルを拡大', exact: true }).click();
    const badges = page.locator('.candidate-details .format-icons button');
    await expect(badges.locator('.format-badge')).toHaveText(['スタン', 'パイオニア', 'モダン', 'レガシー', 'ヴィンテ', '統率者', 'パウパー']);
    expect(await badges.evaluateAll(nodes => nodes.every(node => {
      const box = node.getBoundingClientRect();
      return box.width === 88 && box.height === 32;
    }))).toBe(true);
    expect(await page.locator('.candidate-details').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await badges.nth(4).focus();
    const scroll = await page.locator('.candidate-details').evaluate(node => node.scrollTop);
    await page.keyboard.press('Enter');
    await expect(badges.nth(4)).toBeFocused();
    await expect(page.locator('#candidate-format-disclosure')).toContainText('1枚まで');
    expect(await page.locator('.candidate-details').evaluate(node => node.scrollTop)).toBe(scroll);
    await page.screenshot({ path: testInfo.outputPath(`synthetic-candidate-format-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: '停止', exact: true }).click();
  });
}
