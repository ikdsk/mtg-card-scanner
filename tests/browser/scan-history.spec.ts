import { openRoute, closeRoute } from './immersive-routes.js';
import { test, expect, type Page } from '@playwright/test';
const sheet = (page: Page) => page.getByRole('dialog', { name: 'カードの詳細', exact: true });
// SYNTHETIC worker, input pixels, metadata and provider responses. No recognition accuracy evidence.
const imageUrl = 'https://cards.scryfall.io/small/front/a/a/synthetic.jpg';
const a = { id: 'history-a', oracle_id: 'oracle-a', name: 'Synthetic Alpha', lang: 'en', set: 'tst', set_name: 'Synthetic Set', collector_number: '1', finishes: ['nonfoil', 'foil'], prices: { usd: null, usd_foil: null }, legalities: {}, image_uris: { small: imageUrl, normal: imageUrl } };
const edition = { ...a, id: 'history-edition', lang: 'ja', printed_name: '合成アルファ', set: 'alt', collector_number: '2' };
const b = { ...a, id: 'history-b', oracle_id: 'oracle-b', name: 'Synthetic Beta', image_uris: undefined };
async function scan(page: Page, id: string, confirm = true) {
  await page.evaluate(id => { (window as unknown as { syntheticId: string }).syntheticId = id; }, id);
  const image = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 2; return c.toDataURL().split(',')[1]!; });
  await page.locator('#local-image').setInputFiles({ name: 'SYNTHETIC.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  if(confirm){await expect(page.locator('.tentative')).toBeVisible();await expect(page.locator('.tentative')).toContainText(id === 'history-b' ? 'Synthetic Beta' : 'Synthetic Alpha');if(id===a.id)await expect(page.locator('.tentative .candidate-name')).toHaveText('合成アルファ');await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();}
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
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('https://cards.scryfall.io/**', route => route.fulfill({ status: 404 }));
});
test('session history preserves scans and reopens the saved card read-only without a new event', async ({ page }, info) => {
  await page.goto('/'); await expect(page.locator('.scan-history')).toBeHidden();
  await scan(page, a.id); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await expect(page.locator('.scan-history-row')).toContainText('Synthetic Set (TST) #1 · en · 通常');
  await scan(page, b.id); await expect(page.locator('.scan-history-row')).toHaveCount(2);
  await scan(page, a.id); await expect(page.locator('.scan-history-row')).toHaveCount(3);
  await expect(page.locator('.scan-history-row').nth(0)).toContainText('合成アルファ');
  await expect(page.locator('.scan-history-row').nth(1)).toContainText('Synthetic Beta');
  await expect(page.locator('.scan-history-row').nth(2)).toContainText('合成アルファ');
  const old = page.locator('.scan-history-row').nth(2); await openRoute(page,'履歴'); await old.click();
  const detail = sheet(page); await expect(detail).toBeVisible(); await expect(page.locator('.utility-drawer')).toBeHidden();
  await expect(detail).toContainText('Synthetic Set (TST) #1 · en · nonfoil'); await expect(detail.locator('.candidate-name')).toHaveText('合成アルファ');
  await expect(detail.locator('.price')).toHaveText('この版・言語・加工の価格なし'); await expect(detail.locator('.printing-item')).toHaveCount(2);
  for (const name of ['履歴に保存', '他の候補']) await expect(detail.getByRole('button', { name, exact: true })).toBeHidden();
  await expect(page.locator('.scan-history-row')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeEnabled();
  // Browsing another printing in the sheet is display-only: history rows never change.
  await detail.getByRole('button', { name: /Japanese|ALT/ }).click(); await expect(detail).toContainText('ALT'); await expect(page.locator('.scan-history-row').nth(2)).toContainText('(TST) #1 · en · 通常');
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(detail).toBeHidden();
  await openRoute(page,'履歴');
  await expect(page.getByRole('heading', { name: 'スキャン履歴', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.scan-history-list').evaluate(node => getComputedStyle(node.closest('.drawer-body')!).overflowY)).toBe('auto');
  if (info.project.name === 'mobile-viewport') {
    await page.screenshot({ path: info.outputPath(`mobile-history.png`), fullPage: false });
    await page.screenshot({ path: info.outputPath(`mobile-full-page.png`), fullPage: true });
  }
  await page.reload(); await expect(page.locator('.scan-history')).toBeHidden();
});
test('a delayed old scan cannot insert history after a new scan or history reopen', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.scryfall.com/cards/history-b', async route => { await pending; await route.fulfill({ json: b }).catch(() => {}); });
  await page.goto('/'); await scan(page, a.id); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  const requested = page.waitForRequest('https://api.scryfall.com/cards/history-b');
  await scan(page, b.id, false); await requested;
  await openRoute(page,'履歴'); await page.locator('.scan-history-row').click(); release();
  await expect(sheet(page)).toContainText('Synthetic Set (TST) #1 · en · nonfoil');
  await page.waitForTimeout(200); // Controlled stale response delivery, not live timing evidence.
  await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await expect(sheet(page).locator('.candidate-english')).toHaveText('Synthetic Alpha'); await expect(sheet(page)).not.toContainText('Synthetic Beta');
});
test('manual name search does not record a scan', async ({ page }) => {
  await page.goto('/'); await openRoute(page,'名前検索'); await page.getByRole('searchbox').fill('SYNTHETIC');
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.locator('.search-results button').first().click();
  await expect(sheet(page)).toBeVisible(); await expect(page.locator('.scan-history')).toBeHidden();
});
test('public thumbnail loads lazily and keyboard reopen preserves selection without recording', async ({ page }) => {
  await page.route('https://cards.scryfall.io/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }));
  await page.goto('/'); await scan(page, a.id);
  const row = page.locator('.scan-history-row'); await expect(row).toHaveCount(1);
  const thumbnail = row.locator('img'); await expect(thumbnail).toHaveAttribute('loading', 'lazy');
  await expect(thumbnail).toHaveAttribute('src', imageUrl);
  await openRoute(page,'履歴'); await row.scrollIntoViewIfNeeded();
  await expect.poll(() => thumbnail.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(1);
  await row.focus(); await page.keyboard.press('Enter');
  await expect(sheet(page)).toContainText('Synthetic Set (TST) #1 · en · nonfoil');
  await expect(sheet(page).locator('.candidate-name')).toBeInViewport(); await expect(row).toHaveCount(1);
});
test('history remains reachable while camera runs; reopening stops it and never restarts it', async ({ page }) => {
  await page.goto('/'); await scan(page, a.id); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await page.evaluate(() => {
    const state = window as unknown as { syntheticId: string; cameraCalls: number; historyStream: MediaStream };
    state.syntheticId = ''; state.cameraCalls = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      state.cameraCalls++; const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      canvas.getContext('2d')!.fillRect(0, 0, 640, 480); state.historyStream = canvas.captureStream(5); return state.historyStream;
    };
  });
  await closeRoute(page); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click();
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await expect(page.locator('video')).toHaveJSProperty('videoWidth', 640);
  await expect(page.locator('.result')).toHaveCount(0); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await openRoute(page,'履歴'); await page.locator('.scan-history-row').click();
  await expect(sheet(page)).toContainText('Synthetic Set (TST) #1 · en · nonfoil');
  await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { cameraCalls: number }).cameraCalls)).toBe(1);
  expect(await page.evaluate(() => (window as unknown as { historyStream: MediaStream }).historyStream.getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await page.evaluate(() => { (window as unknown as { syntheticId: string }).syntheticId = 'history-b'; });
  await closeRoute(page); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click();
  await expect(page.locator('.tentative')).toContainText('Synthetic Beta');await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();
  await expect(page.locator('.scan-history-row')).toHaveCount(2);
  await expect(page.locator('.scan-history-row').first()).toContainText('Synthetic Beta');
  // Live acceptance preserves the camera and does not reveal/scroll the result.
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
});
test('101 deliberate scans retain only the newest 100 rows', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/'); await scan(page, edition.id); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  for (let index = 1; index <= 100; index++) {
    await scan(page, a.id);
    await expect(page.locator('.scan-history-row')).toHaveCount(Math.min(index + 1, 100));
  }
  await expect(page.locator('.scan-history-row')).toHaveCount(100);
  // Japanese display names can be shared by all printings; assert evicted physical edition.
  await expect(page.locator('.scan-history-row').filter({ hasText: '(ALT) #2 · ja' })).toHaveCount(0);
  await expect(page.locator('.scan-history-row').filter({ hasText: '(TST) #1 · en' })).toHaveCount(100);
});
