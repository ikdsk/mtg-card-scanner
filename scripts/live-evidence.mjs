// Real model/provider exercise, never run as a deterministic fixture test.
// Requires network, a permitted browser process, and localhost binding.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { release } from 'node:os';
const dir = `artifacts/live/${process.env.MVP_FIXTURE_LABEL ?? 'latest-ja'}`; await mkdir(dir, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), kind: 'LIVE-API + public reference image; not independent photo accuracy', samples: [], network: [], failures: [] };
let server; let browser; let page;
try {
  const fixtures = JSON.parse(await readFile(process.env.MVP_FIXTURE_MANIFEST ?? '/Users/dikeda/workspace/mtg-card-scanner-research/mvp-fixtures/manifest.json', 'utf8'));
  const fixture = fixtures.find(item => item.label === (process.env.MVP_FIXTURE_LABEL ?? 'latest-ja'));
  if (!fixture) throw new Error('Missing public reference fixture');
  const image = fixture.image_path;
  const bytes = await readFile(image);
  evidence.sample = { ...fixture, sha256: createHash('sha256').update(bytes).digest('hex'), note: 'Public reference image; catalog similarity does not establish physical edition/language/finish or independent photo accuracy.' };
  const port = Number(process.env.MVP_PORT ?? 4187);
  server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : { channel: 'chromium' });
  evidence.environment = { node: process.version, platform: process.platform, architecture: process.arch, osRelease: release(), browser: browser.version(), viewport: { width: 1280, height: 900 }, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()), cache: 'fresh browser context / cold IndexedDB; verified local assets on loopback; upstream HTTP cache unspecified', workerSha256: createHash('sha256').update(await readFile('dist/recognition/scanner.worker.mjs')).digest('hex') };
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('request', request => { if (request.method() !== 'GET') evidence.failures.push(`Unexpected non-GET request ${request.method()} ${request.url()}`); });
  page.on('response', async response => {
    if (/api\.(scryfall\.com|frankfurter\.dev)/.test(response.url())) {
      try { evidence.network.push({ url: response.url(), status: response.status(), at: new Date().toISOString(), body: await response.json() }); } catch {}
    }
  });
  page.on('pageerror', error => evidence.failures.push(error.message));
  const navigation = performance.now(); await page.goto(`http://127.0.0.1:${port}/?localAssets`); await page.getByRole('heading', { name: 'この1枚を、もっと知る。' }).waitFor();
  evidence.shellNavigationMs = performance.now() - navigation;
  const recognition = performance.now(); await page.locator('#local-image').setInputFiles(image);
  await page.waitForFunction(() => document.querySelector('.target') || /候補を絞れません|認識できません|準備できません|読み込めません|タイムアウト/.test(document.querySelector('.scan-panel')?.textContent ?? ''), { }, { timeout: 240000 });
  const accepted = Boolean(await page.locator('.target').count());
  if (!accepted) evidence.failures.push('Recognition rejected public reference: ' + await page.locator('.scan-panel').textContent());
  evidence.recognitionPrice = accepted ? await page.locator('.price-box').textContent() : null;
  evidence.recognitionCompletionMs = performance.now() - recognition;
  evidence.recognitionToTargetMs = accepted ? evidence.recognitionCompletionMs : null;
  evidence.recognition = accepted ? { source: await page.locator('.result .eyebrow').first().textContent(), target: await page.locator('.target').textContent() } : { accepted: false };
  await page.getByText('端末内の計測ログ', { exact: true }).click();
  await page.getByRole('button', { name: '計測を表示' }).click();
  evidence.recognitionMarks = JSON.parse(await page.locator('pre').textContent());
  const candidate = evidence.recognitionMarks.filter(mark => mark.event === 'file-frame-result').at(-1)?.detail;
  const recognizedCard = evidence.network.find(entry => entry.body?.id === candidate?.cardId)?.body;
  evidence.recognitionIdentity = { candidate, returnedCard: recognizedCard, oracleMatchesReference: recognizedCard?.oracle_id === fixture.oracle_id, physicalPrintingMatchesReference: recognizedCard?.id === fixture.scryfall_id };
  if (accepted && (!recognizedCard || recognizedCard.oracle_id !== fixture.oracle_id)) evidence.failures.push('Recognition identity does not match public reference oracle');
  await page.getByRole('searchbox').fill(`!"${fixture.name}"`); await page.getByRole('button', { name: '検索', exact: true }).click();
  await page.locator('.search-results button').filter({ hasText: new RegExp('^' + fixture.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s') }).first().click();
  await page.getByText(/^\d+版・言語（全ページ）$/).waitFor({ timeout: 90000 });
  await page.locator('.price').filter({ hasText: /\$|価格なし|取得できません/ }).waitFor({ timeout: 30000 });
  await page.locator('.price-box').filter({ hasText: /最新公表日|為替を取得できません/ }).waitFor({ timeout: 30000 });
  evidence.providerDisplay = await page.locator('.price-box').textContent(); evidence.selectedTarget = await page.locator('.target').textContent();
  if (!(await page.locator('pre').isVisible())) await page.getByText('端末内の計測ログ', { exact: true }).click(); await page.getByRole('button', { name: '計測を表示' }).click();
  if (!(await page.locator('.price').textContent()).startsWith('$') || !(await page.locator('.yen').count())) throw new Error('Live USD/JPY display unavailable');
  evidence.marks = JSON.parse(await page.locator('pre').textContent()); await page.screenshot({ path: `${dir}/desktop.png`, fullPage: true, timeout: 15000 });
  const selectedId = await page.getByLabel('印刷版', { exact: true }).inputValue();
  const finish = await page.getByLabel('加工', { exact: true }).inputValue();
  const selectedCard = evidence.network.flatMap(entry => entry.body?.data ?? [entry.body]).find(card => card?.id === selectedId);
  const fx = evidence.network.find(entry => entry.body?.base === 'USD' && entry.body?.quote === 'JPY')?.body;
  const price = selectedCard?.prices?.[{ nonfoil: 'usd', foil: 'usd_foil', etched: 'usd_etched' }[finish]];
  const usd = await page.locator('.price').textContent();
  const yen = await page.locator('.yen').textContent();
  const expectedUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price));
  const expectedYen = '概算 ' + new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(Math.floor(Number(price) * fx?.rate + .5));
  evidence.providerChecks = { selectedId, finish, providerPrice: price, fx, usd, yen, expectedUsd, expectedYen, passed: typeof price === 'string' && usd === expectedUsd && yen === expectedYen };
  if (!evidence.providerChecks.passed) throw new Error('Live provider/target/USD/JPY mismatch');
  await page.getByLabel('選択版の言語').selectOption(fixture.lang);
  await page.getByLabel('印刷版', { exact: true }).selectOption(fixture.scryfall_id);
  await page.locator('.price').filter({ hasText: /\$|価格なし|取得できません/ }).waitFor({ timeout: 30000 });
  const physicalCard = evidence.network.flatMap(entry => entry.body?.data ?? [entry.body]).find(card => card?.id === fixture.scryfall_id);
  const physicalFinish = await page.getByLabel('加工', { exact: true }).inputValue();
  const physicalPrice = physicalCard?.prices?.[{ nonfoil: 'usd', foil: 'usd_foil', etched: 'usd_etched' }[physicalFinish]];
  const physicalDisplay = await page.locator('.price').textContent();
  evidence.manualOverride = { selectedId: await page.getByLabel('印刷版', { exact: true }).inputValue(), target: await page.locator('.target').textContent(), providerPrice: physicalPrice, display: physicalDisplay, passed: physicalCard?.id === fixture.scryfall_id && (physicalPrice === null ? physicalDisplay === 'この版・言語・加工の価格なし' : typeof physicalPrice === 'string' && physicalDisplay === new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(physicalPrice))) };
  if (!evidence.manualOverride.passed) throw new Error('Manual physical printing/price mismatch');
  await page.screenshot({ path: `${dir}/manual-printing.png`, fullPage: true, timeout: 15000 });
  evidence.note = 'Single desktop run only. No mobile device performance or independent recognition accuracy claim. Compare returned selected Card.prices and FX with providerDisplay.';
} catch (error) {
  evidence.failures.push(`${error.message} ${error.cause?.code ?? ''}`); process.exitCode = 1;
  if (page) {
    evidence.failureUI = await page.locator('body').textContent().catch(() => 'unavailable');
    if (!(await page.locator('pre').isVisible().catch(() => false))) await page.getByText('端末内の計測ログ', { exact: true }).click().catch(() => {});
    await page.getByRole('button', { name: '計測を表示' }).click().catch(() => {});
    evidence.marks = await page.locator('pre').textContent().then(JSON.parse).catch(() => []);
    await page.screenshot({ path: `${dir}/failure.png`, fullPage: true, timeout: 15000 }).catch(() => {});
  }
}
finally {
  await browser?.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve)); await writeFile(`${dir}/evidence.json`, JSON.stringify(evidence, null, 2));
  if (evidence.failures.length) process.exitCode = 1;
  console.log(JSON.stringify({ artifact: `${dir}/evidence.json`, failures: evidence.failures, shellNavigationMs: evidence.shellNavigationMs, recognitionToTargetMs: evidence.recognitionToTargetMs }, null, 2));
}
