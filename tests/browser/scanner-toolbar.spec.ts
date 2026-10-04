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
    const start = page.getByRole('button', { name: 'カメラでスキャン', exact: true });
    const stop = page.getByRole('button', { name: '停止', exact: true });
    async function fitted() {
      const boxes = await Promise.all([settings, start, stop].map(control => control.boundingBox()));
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
  await expect(page.locator('header')).toHaveText('MTG Scanner情報・設定');
  await settings.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.utility-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
});
