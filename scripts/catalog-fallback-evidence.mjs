// Controlled update outage with real verified models/catalog and public reference.
// The v51 feed and v52 HTTP503 are explicitly simulated; no API values are mocked.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { preview } from 'vite';
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
const dir = 'artifacts/catalog-fallback'; await mkdir(dir, { recursive: true });
const feed = JSON.parse(await readFile('public/recognition/catalog-feed-v2.json', 'utf8'));
const old = structuredClone(feed); const catalog = old.families.milo1.catalogs['scryfall/mtg'];
catalog.current_version = 51; catalog.rows = 113111; delete catalog.updates['52'];
const fixtures = JSON.parse(await readFile(process.env.MVP_FIXTURE_MANIFEST ?? '/Users/dikeda/workspace/mtg-card-scanner-research/mvp-fixtures/manifest.json', 'utf8'));
const fixture = fixtures.find(item => item.label === 'classic-ja');
const evidence = { kind: 'Real models/assets/IndexedDB; controlled v51 feed + v52 update outage. Public reference, not photo accuracy.', stages: [], failures: [] };
let server; let browser;
try {
  const port = Number(process.env.MVP_PORT ?? 4187);
  server = await preview({ preview: { host: '127.0.0.1', port, strictPort: true } });
  browser = await chromium.launch({ channel: 'chromium' });
  evidence.environment = { node: process.version, platform: process.platform, architecture: process.arch, browser: browser.version(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()), cache: 'fresh context, then warm models and IndexedDB across three controlled stages' };
  const context = await browser.newContext(); const page = await context.newPage();
  let phase = 'old';
  await context.route('**/recognition/catalog-feed-v2.json', route => route.fulfill({ json: phase === 'old' ? old : feed }));
  await context.route('**/recognition/assets/catalog/**/52/**', route => phase === 'outage' ? route.fulfill({ status: 503, body: 'CONTROLLED update outage' }) : route.continue());
  page.on('pageerror', error => evidence.failures.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?localAssets`);
  for (const [stage, version, fallback] of [['old', 51, false], ['outage', 51, true], ['restored', 52, false]]) {
    phase = stage;
    await page.locator('#local-image').setInputFiles(fixture.image_path);
    await page.waitForFunction(() => /候補を固定|候補を絞れません|準備できません|認識できません/.test(document.querySelector('.scan-panel').textContent), {}, { timeout: 200000 });
    const status = await page.locator('.scan-panel p[role="status"].muted').textContent();
    const passed = status.includes(`辞書 v${version}`) && status.includes('互換キャッシュ') === fallback;
    evidence.stages.push({ stage, status, passed });
    if (!passed) throw new Error(`Catalog stage failed: ${stage}: ${status}`);
  }
  await page.getByText('端末内の計測ログ', { exact: true }).click();
  await page.getByRole('button', { name: '計測を表示' }).click();
  evidence.marks = JSON.parse(await page.locator('pre').textContent());
  await page.screenshot({ path: `${dir}/restored.png`, fullPage: true, timeout: 15000 });
} catch (error) { evidence.failures.push(error.message); process.exitCode = 1; }
finally {
  await browser?.close(); if (server) await new Promise(resolve => server.httpServer.close(resolve));
  await writeFile(`${dir}/evidence.json`, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence.stages));
  if (evidence.failures.length) { console.error(evidence.failures); process.exitCode = 1; }
}
