import { test, expect, type Page } from '@playwright/test';
import { a, beta, gamma, img, installFlow, manyPrintings } from './detail-flow.js';
import { closeRoute, openRoute } from './immersive-routes.js';
// SYNTHETIC camera, worker and provider data throughout. Not recognition or live-price evidence.
const startScan = async (page: Page) => { await page.goto('/'); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click(); await expect(page.locator('.tentative')).toContainText('Synthetic Alpha'); };
const dialog = (page: Page) => page.getByRole('dialog', { name: 'カードの詳細', exact: true });
const openDetail = async (page: Page) => { await page.getByRole('button', { name: '画像から詳細を見る', exact: true }).click(); await expect(dialog(page)).toBeVisible(); };

// 1. Entry hint
for (const width of [320, 390]) test(`start hint with arrow shows only while the camera is stopped ${width}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 844 }); await installFlow(page); await page.goto('/');
  const hint = page.locator('.start-hint'); const start = page.getByRole('button', { name: 'スキャン開始', exact: true });
  await expect(hint).toBeVisible(); await expect(hint).toContainText('タップしてスタート！'); await expect(hint.locator('svg')).toHaveCount(1);
  const h = (await hint.boundingBox())!; const s = (await start.boundingBox())!;
  expect(h.y).toBeGreaterThanOrEqual(s.y + s.height - 2); expect(h.y - (s.y + s.height)).toBeLessThanOrEqual(40);
  expect(h.x < s.x + s.width && h.x + h.width > s.x).toBe(true);
  for (const other of [page.getByRole('button', { name: '情報・設定', exact: true })]) {
    const box = (await other.boundingBox())!;
    expect(h.x < box.x + box.width && h.x + h.width > box.x && h.y < box.y + box.height && h.y + h.height > box.y).toBe(false);
  }
  await page.screenshot({ path: info.outputPath(`start-hint-${width}.png`) });
  await start.click(); await expect(hint).toBeHidden();
  await page.getByRole('button', { name: '停止', exact: true }).click(); await expect(hint).toBeVisible();
});
test('start hint hides together with the intro when a candidate is shown without the camera', async ({ page }) => {
  await installFlow(page); await page.goto('/'); await expect(page.locator('.start-hint')).toBeVisible();
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 2; return c.toDataURL().split(',')[1]!; });
  await page.locator('#local-image').setInputFiles({ name: 's.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await expect(page.locator('.tentative')).toContainText('Synthetic Alpha'); await expect(page.locator('.camera-intro')).toBeHidden(); await expect(page.locator('.start-hint')).toBeHidden();
});

// 2. Reference price wording
test('every price uses 参考価格 and never 概算 + yen', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await expect(page.locator('.tentative .price')).toHaveText('参考価格 ￥150');
  await openDetail(page); await expect(dialog(page).locator('.candidate-price .price')).toHaveText('参考価格 ￥150');
  await expect(page.locator('body')).not.toContainText(/概算 ￥/);
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  await openRoute(page, '名前検索'); await page.getByRole('searchbox').fill('Synthetic'); await page.getByRole('button', { name: '検索', exact: true }).click(); await page.locator('.search-results button').first().click();
  await expect(dialog(page).locator('.price')).toHaveText('参考価格 ￥150'); await expect(page.locator('body')).not.toContainText(/概算 ￥/);
});

// 3. English name size and hierarchy
test('English name is at least 1em and stays below the name in the visual hierarchy', async ({ page }) => {
  await installFlow(page); await startScan(page);
  const m = await page.evaluate(() => {
    const px = (node: Element) => parseFloat(getComputedStyle(node).fontSize);
    const english = document.querySelector('.tentative .candidate-english')!; const name = document.querySelector('.tentative .candidate-name')!;
    return { english: px(english), name: px(name), parent: px(english.parentElement!), nameWeight: Number(getComputedStyle(name).fontWeight), englishWeight: Number(getComputedStyle(english).fontWeight) };
  });
  expect(m.english).toBeGreaterThanOrEqual(m.parent); expect(m.english).toBeGreaterThan(12.48);
  expect(m.name).toBeGreaterThan(m.english); expect(m.nameWeight).toBeGreaterThan(m.englishWeight);
});

// 4. No label prefixes
test('names carry no 日本語： / 英語： prefixes, including loading and unavailable states', async ({ page }) => {
  let release!: () => void; const pending = new Promise<void>(r => { release = r; });
  await installFlow(page, { delayPrintings: pending }); await startScan(page);
  await expect(page.locator('.tentative .candidate-name')).toHaveText('確認中…'); await expect(page.locator('.tentative .candidate-english')).toHaveText('Synthetic Alpha');
  release(); await expect(page.locator('.tentative .candidate-name')).toHaveText('合成アルファ');
  await expect(page.locator('body')).not.toContainText('日本語：'); await expect(page.locator('body')).not.toContainText('英語：');
});
test('unavailable Japanese name is shown without a label', async ({ page }) => {
  await installFlow(page, { printings: [a] }); await startScan(page);
  await expect(page.locator('.tentative .candidate-name')).toHaveText('日本語名は利用できません'); await expect(page.locator('body')).not.toContainText('英語：');
});

// 5. 詳細を見る removed; image and name still open the sheet
test('no 詳細を見る button; image and name taps open the sheet with consistent aria references', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await expect(page.getByRole('button', { name: '詳細を見る', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('[aria-controls]')].filter(n => !document.getElementById(n.getAttribute('aria-controls')!)).map(n => n.getAttribute('aria-label') ?? n.textContent))).toEqual([]);
  for (const label of ['画像から詳細を見る', 'カード名から詳細を見る']) {
    const target = page.getByRole('button', { name: label, exact: true });
    await expect(target).toHaveAttribute('aria-controls', 'candidate-detail-sheet'); await expect(target).toHaveAttribute('aria-expanded', 'false');
    await target.click(); await expect(dialog(page)).toBeVisible(); await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(dialog(page)).toBeHidden(); await expect(target).toBeFocused();
  }
});

// 6. 他の候補
test('他の候補 lists the one confirmed candidate and ends with a name-search fallback', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await expect(page.getByRole('button', { name: '別のカードを探す', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '他の候補', exact: true }).click();
  const list = page.getByRole('dialog', { name: '他の候補', exact: true }); await expect(list).toBeVisible();
  const items = list.locator('.alternative-item'); await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Synthetic Alpha'); await expect(items.first()).toContainText('類似度 0.623');
  const fallback = list.getByRole('button', { name: '見つからない場合は名前検索', exact: true }); await expect(fallback).toBeVisible();
  expect(await list.evaluate(node => { const f = [...node.querySelectorAll('button')].find(b => b.textContent === '見つからない場合は名前検索')!; const last = [...node.querySelectorAll('.alternative-item')].at(-1)!; return !!(last.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
  await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('closing 他の候補 keeps the candidate; tapping the entry opens its detail; camera keeps running', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await page.getByRole('button', { name: '他の候補', exact: true }).click(); await page.locator('.utility-drawer').getByRole('button', { name: '閉じる', exact: true }).click();
  await expect(page.locator('.tentative')).toContainText('Synthetic Alpha'); await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '他の候補', exact: true }).click(); await page.locator('.alternative-item').first().click();
  await expect(dialog(page)).toBeVisible(); await expect(dialog(page)).toContainText('Synthetic Alpha'); await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('name-search fallback searches the candidate name and dismisses it', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await expect(page.locator('.tentative .candidate-name')).toHaveText('合成アルファ');
  await page.getByRole('button', { name: '他の候補', exact: true }).click(); await page.getByRole('button', { name: '見つからない場合は名前検索', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '名前検索', exact: true })).toBeVisible(); await expect(page.getByRole('searchbox')).toHaveValue('合成アルファ'); await expect(page.getByRole('searchbox')).toBeFocused();
  await closeRoute(page); await expect(page.locator('.tentative')).toBeHidden(); await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('a newer verified candidate cannot replace the list entry while 他の候補 is open', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await page.getByRole('button', { name: '他の候補', exact: true }).click();
  await page.evaluate(() => Object.assign((window as any).probe, { id: 'alt-gamma', oracle: 'oracle-gamma' })); await page.waitForTimeout(600);
  await page.locator('.alternative-item').first().click(); await expect(dialog(page)).toContainText('Synthetic Alpha'); await expect(dialog(page)).not.toContainText('Synthetic Gamma');
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(page.locator('.tentative')).toContainText('Synthetic Gamma');
});

// 7. Manual version removed
test('detail sheet has no manual version/language/finish control', async ({ page }) => {
  await installFlow(page); await startScan(page); await openDetail(page);
  await expect(page.getByRole('button', { name: '版・言語・加工を変更', exact: true })).toHaveCount(0); await expect(dialog(page).locator('select')).toHaveCount(0);
});

// 8. Rules before expansion/message
test('oracle rules come before expansion and message in the detail DOM', async ({ page }) => {
  await installFlow(page); await startScan(page); await openDetail(page);
  const order = await page.locator('.candidate-details').evaluate(node => {
    const kids = [...node.children]; const rules = kids.findIndex(k => k.classList.contains('candidate-rules'));
    const expansion = kids.findIndex(k => k.textContent?.includes('Synthetic (TST) #1 · en · nonfoil')); const message = kids.findIndex(k => k.getAttribute('role') === 'status');
    return { rules, expansion, message };
  });
  expect(order.rules).toBeGreaterThanOrEqual(0); expect(order.rules).toBeLessThan(order.expansion); expect(order.rules).toBeLessThan(order.message);
  await expect(page.locator('.candidate-rules')).toContainText('Alpha oracle rules text');
});

// 9. Other printings
test('tapping another printing switches the displayed version using the shared components', async ({ page }) => {
  await installFlow(page); await startScan(page); await openDetail(page);
  const list = dialog(page).locator('.candidate-printings'); await expect(list).toBeVisible();
  expect(await page.locator('.candidate-details').evaluate(node => node.lastElementChild?.classList.contains('candidate-printings'))).toBe(true);
  const items = list.locator('.printing-item'); await expect(items).toHaveCount(3);
  await expect(list.locator('[aria-current="true"]')).toContainText('Synthetic');
  await list.getByRole('button', { name: /Beta Edition/ }).click();
  // Switching must not rebuild the list: the tapped thumbnail keeps keyboard focus.
  await expect(list.getByRole('button', { name: /Beta Edition/ })).toBeFocused();
  const panel = dialog(page);
  await expect(panel).toContainText('Beta Edition (BBB) #7 · en · nonfoil'); await expect(panel.locator('.usd')).toHaveText('$3.00 USD'); await expect(panel.locator('.price')).toHaveText('参考価格 ￥450');
  await expect(panel.locator('.reference-image img')).toHaveAttribute('src', img('beta')); await expect(panel.locator('.candidate-set')).toHaveAttribute('aria-label', '実物の拡張：Beta Edition (BBB)');
  await expect(panel.locator('[data-format="vintage"]')).toHaveAttribute('data-status', 'banned');
  await expect(list.locator('[aria-current="true"]')).toContainText('Beta Edition'); await expect(list.locator('[aria-current="true"]')).toHaveCount(1);
  await expect(page.locator('.scan-history-row')).toHaveCount(0);
  await panel.getByRole('button', { name: '履歴に保存', exact: true }).click(); await expect(page.locator('.scan-history-row')).toHaveCount(1); await expect(page.locator('.scan-history-row')).toContainText('Beta Edition (BBB) #7');
});

// 10. もっと見る
for (const [count, initial, more] of [[25, 10, true], [11, 10, true], [10, 10, false], [3, 3, false]] as const) test(`${count} printings: first ${initial}${more ? ' then もっと見る reveals the rest' : ' without もっと見る'}`, async ({ page }) => {
  await installFlow(page, { printings: manyPrintings(count) }); await startScan(page); await openDetail(page);
  const items = dialog(page).locator('.printing-item'); await expect(items).toHaveCount(initial);
  const button = dialog(page).getByRole('button', { name: 'もっと見る', exact: true });
  if (!more) { await expect(button).toHaveCount(0); return; }
  await expect(button).toBeVisible(); await button.click(); await expect(items).toHaveCount(count); await expect(button).toHaveCount(0);
  await items.nth(count - 1).click(); await expect(dialog(page)).toContainText(`Printing ${count - 1} (P${count - 1}) #${count - 1}`);
});

// 11. History through the detail sheet; result route removed
test('result route is gone and history entries open the read-only detail sheet', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await page.getByRole('button', { name: '履歴に保存', exact: true }).click(); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await expect(page.locator('.result')).toHaveCount(0); await expect(page.locator('.drawer-route[data-route="result"]')).toHaveCount(0);
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await openRoute(page, '履歴'); await expect(page.getByRole('button', { name: '選択中のカードを確認', exact: true })).toHaveCount(0);
  await page.locator('.scan-history-row').click();
  const sheet = dialog(page); await expect(sheet).toBeVisible(); await expect(page.locator('.utility-drawer')).toBeHidden();
  await expect(sheet.locator('.candidate-name')).toHaveText('合成アルファ'); await expect(sheet).toContainText('Synthetic Alpha'); await expect(sheet.locator('.price')).toHaveText('参考価格 ￥150');
  await expect(sheet.locator('.reference-image img')).toHaveAttribute('src', img('a')); await expect(sheet.locator('[data-format="modern"]')).toHaveAttribute('data-status', 'legal');
  await expect(sheet.locator('.candidate-rules')).toContainText('Alpha oracle rules text'); await expect(sheet.locator('.printing-item')).toHaveCount(3);
  for (const name of ['履歴に保存', '他の候補', '版・言語・加工を変更']) await expect(sheet.getByRole('button', { name, exact: true })).toBeHidden();
  await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await sheet.locator('.printing-item').filter({ hasText: 'Beta Edition' }).click(); await expect(sheet).toContainText('Beta Edition (BBB) #7'); await expect(page.locator('.scan-history-row')).toContainText('Synthetic (TST) #1');
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(sheet).toBeHidden();
  await expect(page.locator('.candidate-dock .tentative')).toBeHidden(); await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeEnabled();
});
test('history reopen while scanning stops the camera and never records or restarts', async ({ page }) => {
  await installFlow(page); await startScan(page); await page.getByRole('button', { name: '履歴に保存', exact: true }).click();
  await openRoute(page, '履歴'); await page.locator('.scan-history-row').click(); await expect(dialog(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeEnabled(); await expect(page.locator('.scan-history-row')).toHaveCount(1);
  await page.waitForTimeout(500); expect(await page.evaluate(() => (window as any).probe.frames)).toBeLessThan(40);
});
test('name-search results open the same read-only detail sheet without recording history', async ({ page }) => {
  await installFlow(page); await page.goto('/'); await openRoute(page, '名前検索'); await page.getByRole('searchbox').fill('Synthetic'); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.locator('.search-results button').first().click();
  await expect(dialog(page)).toBeVisible(); await expect(dialog(page)).toContainText('Synthetic Alpha'); await expect(dialog(page).getByRole('button', { name: '履歴に保存', exact: true })).toBeHidden();
  await expect(page.locator('.scan-history')).toBeHidden(); await expect(page.locator('.result')).toHaveCount(0);
});
test('a hidden tab keeps the read-only sheet open but still stops a live camera', async ({ page }) => {
  await installFlow(page); await startScan(page); await page.getByRole('button', { name: '履歴に保存', exact: true }).click();
  const hide = () => page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await hide(); await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toBeVisible(); await expect(page.locator('.tentative')).toBeHidden();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
  await openRoute(page, '履歴'); await page.locator('.scan-history-row').click(); await expect(dialog(page)).toBeVisible();
  await hide(); await expect(dialog(page)).toBeVisible(); await expect(dialog(page).locator('.candidate-name')).toHaveText('合成アルファ');
});
