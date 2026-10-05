import { test, expect } from '@playwright/test';

// Layout only: denied camera permission and failed worker are SYNTHETIC fixtures.
for (const [width, height] of [[1280,900],[320,740],[390,844],[440,956],[320,360],[844,390]] as const) {
  test(`toolbar aligns and separates controls at ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('SYNTHETIC denial', 'NotAllowedError'); };
      class FailedWorker {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        postMessage() { queueMicrotask(() => this.onmessage?.({ data: { type: 'error', message: 'SYNTHETIC initialization failure' } })); }
        terminate() {}
      }
      Object.defineProperty(window, 'Worker', { value: FailedWorker });
    });
    await page.goto('/');
    const settings = page.getByRole('button', { name: '情報・設定', exact: true });
    const start = page.getByRole('button', { name: /^(スキャン開始|停止)$/ });
    async function fitted() {
      const boxes = await Promise.all([settings, start].map(control => control.boundingBox()));
      for (const box of boxes) {
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(Math.abs(box!.y - boxes[0]!.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(box!.height - boxes[0]!.height)).toBeLessThanOrEqual(1);
      }
      const clippedOrOverlapping = await page.locator('.viewport').evaluate(viewport => {
        const bounds = viewport.getBoundingClientRect();
        const boxes = [...viewport.querySelectorAll('header button,.action-panel button')]
          .filter(node => !(node as HTMLElement).hidden).map(node => node.getBoundingClientRect());
        return boxes.some((a, i) => a.left < bounds.left || a.right > bounds.right || a.top < bounds.top || a.bottom > bounds.bottom ||
          boxes.slice(i + 1).some(b => Math.min(a.right,b.right) > Math.max(a.left,b.left) && Math.min(a.bottom,b.bottom) > Math.max(a.top,b.top)));
      });
      expect(clippedOrOverlapping).toBe(false);
    }
    await fitted();
    await start.click();
    await expect(page.locator('.camera-status')).toContainText('カメラの許可がありません');
    await expect(page.getByRole('button', { name: '認識の準備を再試行' })).toBeVisible();
    await fitted();
    await page.screenshot({ path: testInfo.outputPath('toolbar-retry.png') });
    await settings.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.utility-drawer')).toBeVisible();
    await expect(page.locator('#drawer-heading')).toHaveText('設定');
    await page.keyboard.press('Escape');
    await expect(settings).toBeFocused();
    await fitted();
  });
}

test('settings is an accessible monochrome SVG gear with keyboard activation', async ({ page }) => {
  await page.goto('/');
  const settings = page.getByRole('button', { name: '情報・設定', exact: true });
  await expect(settings).toHaveAttribute('aria-label', '情報・設定');
  await expect(settings).toHaveAttribute('title', '情報・設定');
  const svg = settings.locator('svg');
  await expect(svg).toHaveAttribute('aria-hidden', 'true');
  await expect(svg).toHaveAttribute('stroke', 'currentColor');
  await expect(svg.locator('path')).toHaveCount(1);
  await expect(svg.locator('circle')).toHaveCount(1);
  expect(await settings.evaluate(node => {
    const button = node.getBoundingClientRect();
    const label = node.querySelector('span')!.getBoundingClientRect();
    return button.width === 44 && label.width <= 1 && label.height <= 1;
  })).toBe(true);
  await expect(page.locator('header')).toHaveText('Mana Peek情報・設定');
  await settings.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.utility-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
});

 test('camera information omits diagnostic row but retains lifecycle status', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.camera-info')).not.toContainText(/カード検出なし|四隅を検出|類似度|margin/);
  await expect(page.locator('.camera-status')).toContainText('カメラは停止中');
  await expect(page.locator('.detection-overlay')).toHaveCount(1);
});

test('one camera SVG button changes to stop during pending permission and cancels late start', async ({ page }, info) => {
  // SYNTHETIC deferred permission and worker; no real recognition/device evidence.
  await page.addInitScript(() => {
    const probe = { calls: 0, streams: [] as MediaStream[], resolve: null as null | ((stream: MediaStream) => void) };
    Object.assign(window, { toggleProbe: probe });
    navigator.mediaDevices.getUserMedia = () => { probe.calls++; return new Promise(resolve => { probe.resolve = resolve; }); };
    class PendingWorker { postMessage() {} terminate() {} }
    Object.defineProperty(window, 'Worker', { value: PendingWorker });
  });
  await page.goto('/');
  const control = page.locator('.action-panel .primary');
  await expect(control).toHaveCount(1);
  await expect(control).toHaveText('スキャン開始');
  await expect(control.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.evaluate(() => (window as any).toggleProbe.calls)).toBe(0);
  await control.evaluate(node => Object.assign(window, { originalToggle: node }));
  await control.click();
  await expect(control).toHaveText('停止');
  await expect(control).toBeEnabled();
  await expect(page.getByRole('button', { name: 'スキャン開始', exact: true })).toHaveCount(0);
  await control.click();
  await expect(control).toHaveText('スキャン開始');
  await page.evaluate(() => {
    const p = (window as any).toggleProbe;
    const c = document.createElement('canvas'); c.width = 640; c.height = 480;
    const stream = c.captureStream(5); p.streams.push(stream); p.resolve(stream);
  });
  await expect.poll(() => page.evaluate(() => (window as any).toggleProbe.streams[0].getTracks()[0].readyState)).toBe('ended');
  await expect(page.locator('video')).toHaveJSProperty('srcObject', null);
  expect(await page.evaluate(() => (window as any).toggleProbe.calls)).toBe(1);
  expect(await control.evaluate(node => node === (window as any).originalToggle)).toBe(true);
  await control.click();
  await expect(control).toHaveText('停止');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(control).toHaveText('スキャン開始');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  expect(await page.evaluate(() => (window as any).toggleProbe.calls)).toBe(2);
  await page.screenshot({ path: info.outputPath('compact-header.png') });
});
