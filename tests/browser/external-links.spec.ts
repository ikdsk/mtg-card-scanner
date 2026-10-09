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
  await expect(hareruya).toHaveAttribute('href', `https://www.hareruyamtg.com/ja/products/search?product=${query}`);
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
const compactLinks = (page: Page) => page.locator('.candidate-dock .candidate-compact-links');
const expectCompact = async (page: Page, query: string) => {
  const wisdom = compactLinks(page).getByRole('link', { name: 'Wisdom Guild', exact: true });
  const hareruya = compactLinks(page).getByRole('link', { name: '晴れる屋', exact: true });
  await expect(wisdom).toBeVisible(); await expect(hareruya).toBeVisible();
  await expect(wisdom).toHaveAttribute('href', `https://whisper.wisdom-guild.net/search.php?q=${query}`);
  await expect(hareruya).toHaveAttribute('href', `https://www.hareruyamtg.com/ja/products/search?product=${query}`);
  for (const link of [wisdom, hareruya]) { await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer'); }
};
test('compact panel shows both links before the detail sheet opens, and requests nothing', async ({ page }) => {
  const external: string[] = [];
  await page.route(/wisdom-guild|hareruyamtg/, route => { external.push(route.request().url()); return route.abort(); });
  await installFlow(page, { printings: [a, beta, ja] }); await startScan(page);
  await expectCompact(page, encodeURIComponent('合成アルファ'));
  expect(external).toEqual([]);
});
test('compact links fall back to the English name and are not duplicated in the detail sheet', async ({ page }) => {
  await installFlow(page, { printings: [a, beta] }); await startScan(page);
  await expectCompact(page, 'Synthetic%20Alpha');
  await openDetail(page);
  await expect(dialog(page).getByRole('link', { name: 'Wisdom Guild', exact: true })).toBeHidden();
  await expect(dialog(page).getByRole('link', { name: '晴れる屋', exact: true })).toBeHidden();
  await expectLinks(page, 'Synthetic%20Alpha');
});
test('compact links stay current in the read-only history view', async ({ page }) => {
  await installFlow(page, { printings: [a, beta, ja] }); await startScan(page);
  await page.getByRole('button', { name: '履歴に保存', exact: true }).click();
  await openRoute(page, '履歴'); await page.locator('.scan-history-row').first().click(); await expect(dialog(page)).toBeVisible();
  await expectLinks(page, encodeURIComponent('合成アルファ'));
  const hrefs = () => dialog(page).locator('.candidate-compact-links a').evaluateAll(as => as.map(x => x.getAttribute('href')));
  await expect.poll(hrefs).toEqual([`https://whisper.wisdom-guild.net/search.php?q=${encodeURIComponent('合成アルファ')}`, `https://www.hareruyamtg.com/ja/products/search?product=${encodeURIComponent('合成アルファ')}`]);
});

test('footer links to the sister Pokéca Scanner app in a new tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '情報・設定', exact: true }).click();
  const link = page.locator('#information').getByRole('link', { name: 'Pokéca Scanner', exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', 'https://ikdsk.github.io/pokeca-scanner/');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
