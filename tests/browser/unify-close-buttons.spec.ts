import { test, expect, type Page } from '@playwright/test';
import { installFlow } from './detail-flow.js';
// SYNTHETIC camera, worker and provider data. Verifies close-button presentation only.
const startScan = async (page: Page) => { await page.goto('/'); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click(); await expect(page.locator('.tentative')).toContainText('Synthetic Alpha'); };
const iconOnly = async (page: Page, selector: string) => {
  const close = page.locator(selector).getByRole('button', { name: '閉じる', exact: true });
  await expect(close).toHaveCount(1);
  await expect(close).toHaveText('');
  await expect(close.locator('svg')).toHaveCount(1);
  await expect(close.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  return close;
};
test('drawer close is an icon-only 閉じる button and closes the drawer', async ({ page }, info) => {
  await installFlow(page); await startScan(page);
  await page.getByRole('button', { name: '他の候補', exact: true }).click();
  await expect(page.locator('.utility-drawer')).toBeVisible();
  await expect(page.getByRole('button', { name: '補助画面を閉じる' })).toHaveCount(0);
  const close = await iconOnly(page, '.utility-drawer');
  const box = (await close.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(36); expect(box.height).toBeGreaterThanOrEqual(36);
  await page.screenshot({ path: info.outputPath('drawer-close.png') });
  await close.click(); await expect(page.locator('.utility-drawer')).toBeHidden();
});
test('detail sheet close is an SVG icon (no × text) and closes the sheet', async ({ page }, info) => {
  await installFlow(page); await startScan(page);
  await page.getByRole('button', { name: '画像から詳細を見る', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'カードの詳細', exact: true }); await expect(sheet).toBeVisible();
  const close = await iconOnly(page, '.detail-sheet-header');
  await expect(close).not.toContainText('×');
  await page.screenshot({ path: info.outputPath('detail-close.png') });
  await close.click(); await expect(sheet).toBeHidden();
});
test('drawer and detail close icons share the same glyph path', async ({ page }) => {
  await installFlow(page); await startScan(page);
  await page.getByRole('button', { name: '画像から詳細を見る', exact: true }).click();
  const detailPath = await page.locator('.detail-sheet-header button svg').innerHTML();
  await page.locator('.detail-sheet-header').getByRole('button', { name: '閉じる' }).click();
  await page.getByRole('button', { name: '他の候補', exact: true }).click();
  expect(await page.locator('.drawer-bar button svg').innerHTML()).toBe(detailPath);
});
