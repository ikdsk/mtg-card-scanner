import { expect, it } from 'vitest';
import { ResultSession } from '../../src/ui/session.js';
import { card } from './fixtures.js';
it('new scan clears the selected card and invalidates outstanding price results (SYNTHETIC)', async () => {
  let deliver!: (c: typeof card) => void;
  const s = new ResultSession(() => new Promise(resolve => { deliver = resolve; }), async () => ({ jpyPerUsd: 150, asOf: '2026-10-02' }), () => {});
  const request = s.select(card, 'nonfoil');
  s.reset(); deliver(card); await request;
  expect(s.value.card).toBeNull(); expect(s.value.quote).toBeNull(); expect(s.value.loading).toBe(false);
});
it('clears old quotes immediately and rejects late success after finish override (SYNTHETIC)', async () => {
  const pending: ((c: typeof card) => void)[] = [];
  const s = new ResultSession(() => new Promise(resolve => pending.push(resolve)), async () => ({ jpyPerUsd: 150, asOf: '2026-10-02' }), () => {});
  const a = s.select(card, 'nonfoil');
  expect(s.value.loading).toBe(true);
  const b = s.select(card, 'foil');
  expect(s.value.quote).toBeNull();
  pending[1]!({ ...card, prices: { usd: '0.00', usd_foil: '2.00' } }); await b;
  pending[0]!(card); await a;
  expect(s.value.quote).toBe('2.00');
  expect(s.value.finish).toBe('foil');
});
it('late error cannot erase another selection success; FX failure keeps USD zero (SYNTHETIC)', async () => {
  const pending: { resolve: (c: typeof card) => void; reject: (e: Error) => void }[] = [];
  const s = new ResultSession(() => new Promise((resolve, reject) => pending.push({ resolve, reject })), async () => { throw new Error('FX unavailable'); }, () => {});
  const a = s.select(card, 'foil'); const b = s.select({ ...card, id: 'b' }, 'nonfoil');
  pending[1]!.resolve({ ...card, id: 'b' }); await b;
  pending[0]!.reject(new Error('late failure')); await a;
  expect(s.value.quote).toBe('0.00'); expect(s.value.fx).toBeNull(); expect(s.value.fxError).toBe(true); expect(s.value.error).toBeNull();
});
it('ABA ignores the first identical target response and rejects a mismatched provider target (SYNTHETIC)', async () => {
  const pending: ((c: typeof card) => void)[] = [];
  const s = new ResultSession(() => new Promise(resolve => pending.push(resolve)), async () => ({ jpyPerUsd: 150, asOf: '2026-10-02' }), () => {});
  const a1 = s.select(card, 'nonfoil'); const b = s.select({ ...card, id: 'b' }, 'nonfoil'); const a2 = s.select(card, 'nonfoil');
  pending[2]!({ ...card, prices: { usd: '4.00' } }); await a2; pending[1]!({ ...card, id: 'b' }); await b; pending[0]!(card); await a1;
  expect(s.value.quote).toBe('4.00');
  const mismatch = s.select(card, 'nonfoil'); pending[3]!({ ...card, lang: 'ja' }); await mismatch;
  expect(s.value.quote).toBeNull(); expect(s.value.error).toContain('対象が一致しません');
});
it('settles FX state even when the card provider fails (SYNTHETIC)', async () => {
  const s = new ResultSession(async () => { throw new Error('Card failure'); }, async () => { throw new Error('FX failure'); }, () => {});
  await s.select(card, 'nonfoil');
  expect(s.value.error).toBe('Card failure'); expect(s.value.loading).toBe(false); expect(s.value.fxError).toBe(true);
});
