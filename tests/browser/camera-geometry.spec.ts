import { test, expect, chromium } from '@playwright/test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// SYNTHETIC I420 camera, SYNTHETIC rejecting worker. Tests presentation/input
// geometry and lifecycle only; real inference evidence is in the private probe.
for (const [width, height] of [[1280, 720], [720, 1280]]) {
  test(`full ${width}×${height} fake camera agrees with preview and stops`, async ({ baseURL, viewport }) => {
    const directory = await mkdtemp(join(tmpdir(), 'camera-geometry-'));
    const path = join(directory, 'synthetic.y4m');
    const y = Buffer.alloc(width! * height!);
    for (let row = 0; row < height!; row++) for (let col = 0; col < width!; col++) {
      y[row * width! + col] = [32, 96, 160, 224][(row >= height! / 2 ? 2 : 0) + (col >= width! / 2 ? 1 : 0)]!;
    }
    const frame = Buffer.concat([Buffer.from('FRAME\n'), y, Buffer.alloc(width! * height! / 2, 128)]);
    await writeFile(path, Buffer.concat([Buffer.from(`YUV4MPEG2 W${width} H${height} F5:1 Ip A1:1 C420\n`), frame, frame, frame]));
    const browser = await chromium.launch({ channel: 'chromium', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${path}`] });
    try {
      const context = await browser.newContext({ permissions: ['camera'], viewport: viewport ?? { width: 390, height: 844 }, serviceWorkers: 'block' });
      await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      const page = await context.newPage();
      await page.addInitScript(() => {
        const probe = { inputs: [] as { width: number; height: number; pixels: number[] }[], tracks: [] as MediaStreamTrack[] };
        Object.assign(window, { geometryProbe: probe });
        class SyntheticRejectingWorker {
          onmessage: ((event: { data: unknown }) => void) | null = null;
          postMessage(data: { type: string; bitmap?: ImageBitmap }) {
            if (data.bitmap) {
              const canvas = document.createElement('canvas'); canvas.width = data.bitmap.width; canvas.height = data.bitmap.height;
              const ctx = canvas.getContext('2d')!; ctx.drawImage(data.bitmap, 0, 0);
              probe.inputs.push({ width: canvas.width, height: canvas.height, pixels: [[10, 10], [canvas.width - 10, 10], [10, canvas.height - 10], [canvas.width - 10, canvas.height - 10]].map(([x, y]) => ctx.getImageData(x!, y!, 1, 1).data[0]!) });
              data.bitmap.close();
            }
            setTimeout(() => this.onmessage?.({ data: data.type === 'init' ? { type: 'ready', catalogVersion: 52 } : { type: 'result', cardPresent: false, cornersValid: false, score: 0, margin: 0 } }), 0);
          }
          terminate() {}
        }
        Object.defineProperty(window, 'Worker', { value: SyntheticRejectingWorker });
      });
      await page.goto(baseURL!);
      await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
      await page.waitForFunction(() => (window as unknown as { geometryProbe: { inputs: unknown[] } }).geometryProbe.inputs.length > 0);
      const preview = await page.locator('video').evaluate(video => {
        const v = video as HTMLVideoElement;
        (window as unknown as { geometryProbe: { tracks: MediaStreamTrack[] } }).geometryProbe.tracks = (v.srcObject as MediaStream).getTracks();
        const rect = v.getBoundingClientRect();
        return { width: v.videoWidth, height: v.videoHeight, ratio: rect.width / rect.height, fit: getComputedStyle(v).objectFit };
      });
      expect(preview.fit).toBe('contain');
      expect(preview.ratio).toBeCloseTo(preview.width / preview.height, 2);
      const input = await page.evaluate(() => (window as unknown as { geometryProbe: { inputs: { width: number; height: number; pixels: number[] }[] } }).geometryProbe.inputs[0]!);
      expect(Math.max(input.width, input.height)).toBe(1024);
      expect(input.width / input.height).toBeCloseTo(width! / height!, 2);
      // Four quadrants reach the inference edges; no hidden region or padding.
      for (const [index, expected] of [19, 93, 168, 242].entries()) expect(Math.abs(input.pixels[index]! - expected)).toBeLessThan(4);
      await page.getByRole('button', { name: '停止', exact: true }).click();
      expect(await page.evaluate(() => (window as unknown as { geometryProbe: { tracks: MediaStreamTrack[] } }).geometryProbe.tracks.every(t => t.readyState === 'ended'))).toBe(true);
      await page.getByRole('button', { name: 'カメラでスキャン', exact: true }).click();
      await page.waitForFunction(() => (document.querySelector('video')!.srcObject as MediaStream | null)?.getTracks().some(t => t.readyState === 'live'));
      // Dispatch the real handler with a synthetic background state.
      await page.evaluate(() => {
        const probe = (window as unknown as { geometryProbe: { tracks: MediaStreamTrack[] } }).geometryProbe;
        probe.tracks = (document.querySelector('video')!.srcObject as MediaStream).getTracks();
        Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(await page.evaluate(() => (window as unknown as { geometryProbe: { tracks: MediaStreamTrack[] } }).geometryProbe.tracks.every(t => t.readyState === 'ended'))).toBe(true);
      await expect(page.getByRole('button', { name: 'カメラでスキャン', exact: true })).toBeEnabled();
    } finally { await browser.close(); await rm(directory, { recursive: true }); }
  });
}
