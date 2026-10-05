import { test, expect, type Page } from '@playwright/test';
import { a, beta, ja, delta, gamma, installFlow, manyPrintings } from './detail-flow.js';
// SYNTHETIC camera, worker results (including the top-N alternatives) and Scryfall data.
// Not recognition accuracy or provider evidence.
const startScan = async (page: Page) => { await page.goto('/'); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click(); await expect(page.locator('.tentative')).toContainText('Synthetic Alpha'); };
const dialog = (page: Page) => page.getByRole('dialog', { name: 'カードの詳細', exact: true });
const openDetail = async (page: Page) => { await page.getByRole('button', { name: '画像から詳細を見る', exact: true }).click(); await expect(dialog(page)).toBeVisible(); };
const lang = (code: string, index: number) => ({ ...a, id: `alt-${code}-${index}`, lang: code, set: `x${code}${index}`, set_name: `Edition ${code}${index}`, collector_number: String(100 + index) });
const openList = async (page: Page) => { await page.getByRole('button', { name: '他の候補', exact: true }).click(); const list = page.getByRole('dialog', { name: '他の候補', exact: true }); await expect(list).toBeVisible(); return list; };

// Request 1: other printings are Japanese and English only
test('other printings list only ja and en printings', async ({ page }) => {
  await installFlow(page, { printings: [a, lang('de', 1), beta, lang('fr', 2), ja, lang('zhs', 3), lang('zht', 4)] }); await startScan(page); await openDetail(page);
  const items = dialog(page).locator('.printing-item'); await expect(items).toHaveCount(3);
  const labels = await items.evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')!));
  for (const label of labels) expect(label).toMatch(/ · (en|ja) を表示$/);
  await expect(dialog(page).locator('.candidate-printings')).not.toContainText(/ · (de|fr|zhs|zht)/);
});
test('when only the current printing remains after filtering, no other printings are announced', async ({ page }) => {
  await installFlow(page, { printings: [a, lang('de', 1), lang('fr', 2)] }); await startScan(page); await openDetail(page);
  await expect(dialog(page).locator('.candidate-printings')).toContainText('他の印刷版はありません。'); await expect(dialog(page).locator('.printing-item')).toHaveCount(1);
});
test('when the listing holds no ja/en printing, only the re-added current card remains and the empty message shows', async ({ page }) => {
  await installFlow(page, { printings: [lang('de', 1), lang('fr', 2)] }); await startScan(page); await openDetail(page);
  await expect(dialog(page).locator('.candidate-printings')).toContainText('他の印刷版はありません。'); await expect(dialog(page).locator('.printing-item')).toHaveCount(1);
});
test('a single other ja/en printing is listed and the empty message is not shown', async ({ page }) => {
  await installFlow(page, { printings: [lang('de', 1), beta] }); // the current card `a` is absent from the listing and is re-added
  await startScan(page); await openDetail(page);
  await expect(dialog(page).locator('.printing-item')).toHaveCount(2); await expect(dialog(page).locator('.candidate-printings')).not.toContainText('他の印刷版はありません。');
});
test('もっと見る pages through the filtered count; Japanese detail still resolves from the unfiltered data', async ({ page }) => {
  const mixed = [...manyPrintings(25).map((card, i) => i % 5 === 4 ? { ...card, lang: 'de' } : card), ja];
  await installFlow(page, { printings: mixed }); await startScan(page); await openDetail(page);
  const items = dialog(page).locator('.printing-item'); await expect(items).toHaveCount(10);
  const more = dialog(page).getByRole('button', { name: 'もっと見る', exact: true }); await more.click();
  await expect(items).toHaveCount(21); await expect(more).toHaveCount(0);
  await expect(page.locator('.tentative .candidate-name')).toHaveText('合成アルファ');
});

// Request 2: top-N alternatives
const alternatives = [{ cardId: 'alt-delta', score: .41, secondaryId: 'oracle-delta' }, { cardId: 'alt-gamma', score: .52, secondaryId: 'oracle-gamma' }, { cardId: 'alt-missing', score: .3, secondaryId: 'oracle-missing' }];
test('他の候補 lists verified top-N candidates by similarity and skips unverifiable ones', async ({ page }) => {
  await installFlow(page, { alternatives }); await startScan(page);
  const list = await openList(page); const items = list.locator('.alternative-item');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText('Synthetic Alpha'); await expect(items.nth(0)).toContainText('現在の候補');
  await expect(items.nth(1)).toContainText('Synthetic Gamma'); await expect(items.nth(1)).toContainText('類似度 0.520');
  await expect(items.nth(2)).toContainText('Synthetic Delta'); await expect(items.nth(2)).toContainText('類似度 0.410');
  await expect(list).not.toContainText('alt-missing'); await expect(list.getByRole('button', { name: '見つからない場合は名前検索', exact: true })).toBeVisible();
});
test('alternative metadata is fetched only after 他の候補 is opened', async ({ page }) => {
  const cardRequests: string[] = []; await installFlow(page, { alternatives, cardRequests }); await startScan(page); await page.waitForTimeout(600);
  expect(cardRequests).not.toContain('alt-gamma'); expect(cardRequests).not.toContain('alt-delta');
  await openList(page); await expect(page.locator('.alternative-item')).toHaveCount(3);
  expect(cardRequests.filter(id => id === 'alt-gamma')).toHaveLength(1);
});
test('choosing another candidate shows it, opens its detail, and the camera frames of the old card do not swap it back', async ({ page }) => {
  await installFlow(page, { alternatives }); await startScan(page);
  const list = await openList(page); await list.locator('.alternative-item', { hasText: 'Synthetic Gamma' }).click();
  await expect(dialog(page)).toBeVisible(); await expect(dialog(page)).toContainText('Synthetic Gamma'); await expect(dialog(page)).not.toContainText('Synthetic Alpha');
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await page.waitForTimeout(800);
  await expect(page.locator('.tentative')).toContainText('Synthetic Gamma'); await expect(page.locator('.tentative')).not.toContainText('Synthetic Alpha');
  await expect(page.getByRole('button', { name: '停止', exact: true })).toBeEnabled(); await expect(page.locator('.scan-history-row')).toHaveCount(0);
  await page.getByRole('button', { name: '履歴に保存', exact: true }).click();
});
test('without worker alternatives the list stays the single current candidate (no requests)', async ({ page }) => {
  const cardRequests: string[] = []; await installFlow(page, { cardRequests }); await startScan(page);
  const list = await openList(page); await expect(list.locator('.alternative-item')).toHaveCount(1);
  expect(cardRequests.filter(id => id !== 'alt-a')).toEqual([]);
});
test('a different card detected after choosing an alternative is proposed normally', async ({ page }) => {
  await installFlow(page, { alternatives }); await startScan(page);
  const list = await openList(page); await list.locator('.alternative-item', { hasText: 'Synthetic Delta' }).click();
  await page.getByRole('button', { name: '閉じる', exact: true }).click(); await expect(page.locator('.tentative')).toContainText('Synthetic Delta');
  await page.evaluate(() => Object.assign((window as any).probe, { id: 'alt-gamma', oracle: 'oracle-gamma' }));
  await expect(page.locator('.tentative')).toContainText('Synthetic Gamma');
});
void gamma; void delta;
