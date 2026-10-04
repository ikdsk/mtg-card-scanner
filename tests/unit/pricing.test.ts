import { describe, expect, it } from 'vitest';
import { formatReferencePrice } from '../../src/domain/pricing.js';

// All prices and FX values are synthetic fixtures, not provider observations.
describe('formatReferencePrice', () => {
  it('rejects trailing line terminators in FX asOf', () => {
    for (const asOf of ['2026-10-04\n', '2026-10-04\r', '2026-10-04T12:00:00Z\n']) {
      expect(formatReferencePrice('1', { jpyPerUsd: 150, asOf })).toEqual({ usd: '$1.00', jpy: null });
    }
  });
  it('retains USD when only rounded JPY exceeds the safe integer bound', () => {
    expect(formatReferencePrice('1', { jpyPerUsd: Number.MAX_SAFE_INTEGER, asOf: '2026-10-04' })).toEqual({ usd: '$1.00', jpy: '￥9,007,199,254,740,991' });
    for (const rate of [Number.MAX_SAFE_INTEGER + 1, Number.MAX_VALUE, 1e21]) {
      expect(formatReferencePrice('1', { jpyPerUsd: rate, asOf: '2026-10-04' })).toEqual({ usd: '$1.00', jpy: null });
    }
    expect(formatReferencePrice('0', { jpyPerUsd: Number.MAX_VALUE, asOf: '2026-10-04' })).toEqual({ usd: '$0.00', jpy: '￥0' });
  });
  it('rounds exact decimal FX products half up without binary drift', () => {
    for (const [usd, rate, jpy] of [['0.29', 50, '￥15'], ['0.01', 150, '￥2'], ['100', 1.005, '￥101'], ['1', 0.499999, '￥0'], ['1', 0.5, '￥1'], ['1', 0.500001, '￥1'], ['1', 1e-7, '￥0'], ['0', Number.MIN_VALUE, '￥0']] as const) {
      expect(formatReferencePrice(usd, { jpyPerUsd: rate, asOf: '2026-10-04' }).jpy).toBe(jpy);
    }
  });
  it('requires strict ISO calendar dates or timestamps for FX', () => {
    for (const asOf of ['', '10/04/2026', '2026-2-01', '2026-02-29', '2026-04-31', '2026-00-10', '2026-13-01', '2026-01-00', '2026-01-32', '1900-02-29', '2026-02-30T00:00:00Z', '2026-10-04T25:00:00Z', '2026-10-04T12:60:00Z', '2026-10-04T12:00:60Z', '2026-10-04T12:00:00+24:00', '2026-10-04T12:00:00+09:60', '2026-10-04junk', ' 2026-10-04 ']) {
      expect(formatReferencePrice('1', { jpyPerUsd: 150, asOf })).toEqual({ usd: '$1.00', jpy: null });
    }
    for (const asOf of ['2024-02-29', '2000-02-29', '2026-10-04T12:34:56Z', '2026-10-04T12:34:56.123+09:00', '2026-10-04T12:34:56-05:00', '2026-10-04T12:34:56']) {
      expect(formatReferencePrice('1', { jpyPerUsd: 150, asOf })).toEqual({ usd: '$1.00', jpy: '￥150' });
    }
  });
  it('retains USD for nonpositive or nonfinite FX rates', () => {
    for (const rate of [0, -1, NaN, Infinity, -Infinity]) {
      expect(formatReferencePrice('1', { jpyPerUsd: rate, asOf: '2026-10-04' })).toEqual({ usd: '$1.00', jpy: null });
    }
  });
  it('converts with supplied FX into Japanese yen labels', () => {
    expect(formatReferencePrice('12.34', { jpyPerUsd: 150, asOf: '2026-10-04' })).toEqual({ usd: '$12.34', jpy: '￥1,851' });
    expect(formatReferencePrice('0', { jpyPerUsd: 150, asOf: '2026-10-04' })).toEqual({ usd: '$0.00', jpy: '￥0' });
  });
  it('bounds USD by exact safe integer cents', () => {
    expect(formatReferencePrice('90071992547409.91', null)).toEqual({ usd: '$90,071,992,547,409.91', jpy: null });
    for (const input of ['90071992547409.92', '90071992547409.93', '9'.repeat(400)]) {
      expect(formatReferencePrice(input, null)).toEqual({ usd: null, jpy: null });
    }
  });
  it('rejects USD outside nonnegative two-place decimal syntax', () => {
    for (const input of ['', ' ', '-1', '-0', '+1', 'NaN', 'Infinity', '1e2', '0x10', '.5', '1.', '1.005', '1,000', '1\n2']) {
      expect(formatReferencePrice(input, null)).toEqual({ usd: null, jpy: null });
    }
  });
  it('formats valid trimmed USD including zero without inventing FX', () => {
    for (const [input, label] of [[' 1234.50 ', '$1,234.50'], ['0', '$0.00'], ['12.3', '$12.30'], ['0001.02', '$1.02']]) {
      expect(formatReferencePrice(input!, null)).toEqual({ usd: label, jpy: null });
    }
  });
  it('returns missing labels for missing USD', () => {
    expect(formatReferencePrice(null, null)).toEqual({ usd: null, jpy: null });
  });
});
