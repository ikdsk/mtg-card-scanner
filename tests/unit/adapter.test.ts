import { expect, it, vi } from 'vitest';
import { Recognizer } from '../../src/recognition/adapter.js';
it('dispose rejects pending initialization instead of leaving a loading promise forever (SYNTHETIC Worker)', async () => {
  vi.stubGlobal('location', new URL('https://localhost/'));
  vi.stubGlobal('Worker', class { terminate() {} postMessage() {} });
  const r = new Recognizer(() => {}); let outcome = 'pending';
  const init = r.init().then(() => { outcome = 'ready'; }, () => { outcome = 'cancelled'; });
  r.dispose(); await Promise.resolve(); await Promise.resolve();
  expect(outcome).toBe('cancelled');
  await init; vi.unstubAllGlobals();
});
it('allows only one frame even while the model is still loading (SYNTHETIC)', async () => {
  vi.stubGlobal('location', new URL('https://localhost/'));
  let worker!: { onmessage: (message: { data: unknown }) => void; messages: { type: string }[] };
  vi.stubGlobal('Worker', class {
    messages: { type: string }[] = []; onmessage!: (message: { data: unknown }) => void;
    constructor() { worker = this; }
    terminate() {} postMessage(message: { type: string }) { this.messages.push(message); }
  });
  const r = new Recognizer(() => {});
  const bitmap = () => ({ close: vi.fn() } as unknown as ImageBitmap);
  const first = r.frame(bitmap()); const secondBitmap = bitmap();
  const second = r.frame(secondBitmap).then(() => 'accepted', () => 'rejected');
  worker.onmessage({ data: { type: 'ready', catalogVersion: 52 } }); await Promise.resolve(); await Promise.resolve();
  expect(worker.messages.filter(x => x.type === 'frame')).toHaveLength(1);
  expect(await second).toBe('rejected'); expect(secondBitmap.close).toHaveBeenCalledOnce();
  worker.onmessage({ data: { type: 'result', cardId: null } }); await first; r.dispose(); vi.unstubAllGlobals();
});
it('cleans a worker and frame slot when bitmap transfer fails (SYNTHETIC)', async () => {
  vi.stubGlobal('location', new URL('https://localhost/'));
  let worker!: { onmessage: (message: { data: unknown }) => void; terminated: boolean };
  vi.stubGlobal('Worker', class {
    onmessage!: (message: { data: unknown }) => void; terminated = false;
    constructor() { worker = this; }
    terminate() { this.terminated = true; }
    postMessage(message: { type: string }) { if (message.type === 'frame') throw new Error('Transfer failed'); }
  });
  const r = new Recognizer(() => {}); const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
  const frame = r.frame(bitmap); worker.onmessage({ data: { type: 'ready', catalogVersion: 52 } });
  await expect(frame).rejects.toThrow('Transfer failed'); expect(bitmap.close).toHaveBeenCalledOnce(); expect(worker.terminated).toBe(true);
  r.dispose(); vi.unstubAllGlobals();
});
import { normalizeAlternatives } from '../../src/recognition/adapter.js';
it('normalizes worker alternatives and drops malformed entries (SYNTHETIC)', () => {
  const good = { cardId: 'b', score: .4, faceIndex: 1, cardName: 'B', secondaryId: 'o-b', secondaryIdField: 'scryfallOracleId' };
  expect(normalizeAlternatives([good, { cardId: '', score: .3 }, { cardId: 'c', score: NaN }, null, 'x', { cardId: 'd', score: .2 }]))
    .toEqual([good, { cardId: 'd', score: .2, faceIndex: 0, cardName: null, secondaryId: null, secondaryIdField: null }]);
  expect(normalizeAlternatives(undefined)).toEqual([]);
  expect(normalizeAlternatives({ length: 1 })).toEqual([]);
});
it('frame() resolves with normalized alternatives, [] when the worker sends none (SYNTHETIC)', async () => {
  vi.stubGlobal('location', new URL('https://localhost/'));
  let worker!: { onmessage: (message: { data: unknown }) => void };
  vi.stubGlobal('Worker', class { onmessage!: (message: { data: unknown }) => void; constructor() { worker = this; } terminate() {} postMessage() {} });
  const r = new Recognizer(() => {});
  const run = async (payload: object) => { const frame = r.frame({ close: vi.fn() } as unknown as ImageBitmap); worker.onmessage({ data: { type: 'ready', catalogVersion: 52 } }); await Promise.resolve(); await Promise.resolve(); worker.onmessage({ data: { type: 'result', cardId: 'a', ...payload } }); return frame; };
  expect((await run({ alternatives: [{ cardId: 'b', score: .5 }] })).alternatives).toEqual([{ cardId: 'b', score: .5, faceIndex: 0, cardName: null, secondaryId: null, secondaryIdField: null }]);
  expect((await run({})).alternatives).toEqual([]);
  r.dispose(); vi.unstubAllGlobals();
});
