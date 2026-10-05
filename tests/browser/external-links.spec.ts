import { test, expect, type Page } from '@playwright/test';
import { a, beta, ja, installFlow } from './detail-flow.js';
import { openRoute } from './immersive-routes.js';
// SYNTHETIC camera, worker results and Scryfall data. Only href/target/rel are checked; no external site is contacted.
const startScan = async (page: Page) => { await page.goto('/'); await page.getByRole('button', { name: 'スキャン開始', exact: true }).click(); await expect(page.locator('.tentative')).toContainText('Synthetic Alpha'); };
const dialog = (page: Page) => page.getByRole('dialog', { name: 'カードの詳細', exact: true });
const openDetail = async (page: Page) => { await page.getByRole('button', { name: '画像から詳細を見る', exact: true }).click(); await expect(dialog(page)).toBeVisible(); };
const expectLinks = async (page: Page, query: string) => {
  const wisdom = dialog(page).getByRole('link', { name: 'Wisdom Guildで見る', exact: true });
  const hareruya = dialog(page).getByRole('link', { name: '晴れる屋で見る', exact: true });
  await expect(wisdom).toHaveAttribute('href', `https://whisper.wisdom-guild.net/search.php?q=${query}`);
  await expect(hareruya).toHaveAttribute('href', `https://www.hareruyamtg.com/ja/products/search?name=${query}`);
  for (const link of [wisdom, hareruya]) { await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer'); }
};
test('detail sheet links use the Japanese name, and nothing is requested before a click', async ({ page }) => {
  const external: string[] = [];
  await page.route(/wisdom-guild|hareruyamtg/, route => { external.push(route.request().url()); return route.abort(); });
  await installFlow(page, { printings: [a, beta, ja] }); await startScan(page); await openDetail(page);
  await expect(dialog(page).locator('.candidate-name')).toHaveText('合成アルファ');
  await expectLinks(page, encodeURIComponent('合成アルファ'));
  expect(external).toEqual([]);
});
test('detail sheet links fall back to the English name when no Japanese name exists', async ({ page }) => {
  await installFlow(page, { printings: [a, beta] }); await startScan(page); await openDetail(page);
  await expect(dialog(page).locator('.candidate-name')).toHaveText('日本語名は利用できません');
  await expectLinks(page, 'Synthetic%20Alpha');
});
test('links also work in the read-only history view', async ({ page }) => {
  await installFlow(page, { printings: [a, beta, ja] }); await startScan(page);
  await page.getByRole('button', { name: '履歴に保存', exact: true }).click();
  await openRoute(page, '履歴'); await page.locator('.scan-history-row').first().click(); await expect(dialog(page)).toBeVisible();
  await expectLinks(page, encodeURIComponent('合成アルファ'));
});
