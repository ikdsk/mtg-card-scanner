import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureCameraFrame } from '../../src/ui/camera-geometry.js';

describe('full-frame camera input', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('retains both landscape edges and aspect within the 1024 bound', async () => {
    const bitmap = {} as ImageBitmap;
    const create = vi.fn().mockResolvedValue(bitmap);
    vi.stubGlobal('createImageBitmap', create);
    const video = { videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement;
    expect(await captureCameraFrame(video)).toBe(bitmap);
    expect(create).toHaveBeenCalledWith(video, { resizeWidth: 1024, resizeHeight: 576 });
  });
  it.each([[1080, 1920, 576, 1024], [330, 405, 330, 405], [443, 335, 443, 335], [4032, 3024, 1024, 768]])(
    'retains portrait/landscape edges and never enlarges %i×%i', async (width, height, outputWidth, outputHeight) => {
      const create = vi.fn().mockResolvedValue({});
      vi.stubGlobal('createImageBitmap', create);
      const video = { videoWidth: width, videoHeight: height } as HTMLVideoElement;
      await captureCameraFrame(video);
      expect(create).toHaveBeenCalledWith(video, { resizeWidth: outputWidth, resizeHeight: outputHeight });
      expect(Math.max(outputWidth, outputHeight)).toBeLessThanOrEqual(1024);
      expect(Math.abs(outputWidth / outputHeight - width / height)).toBeLessThanOrEqual(1 / outputHeight);
    },
  );
});
