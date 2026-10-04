import { describe, expect, it } from 'vitest';
import { formatReferencePrice } from '../../src/domain/pricing.js';

// All values are synthetic contract fixtures, not observed provider quotes.
const fx = { jpyPerUsd: 150, asOf: '2024-02-29' };

describe('independent price contract regressions', () => {
  it.each([null, '', '   ', '-0.01', '-1', 'NaN', 'Infinity', '1e2', '0x10', '1,000.00', '$1.00', '1.001', '1 0'])('rejects invalid USD %j', (usd) => {
    expect(formatReferencePrice(usd, fx)).toEqual({ usd: null, jpy: null });
  });

  it.each(['0', '0.0', '0.00', ' 0.00 '])('preserves zero USD %j', (usd) => {
    expect(formatReferencePrice(usd, fx)).toEqual({ usd: '$0.00', jpy: '￥0' });
  });

  it('trims USD and formats the declared currency locales', () => {
    expect(formatReferencePrice(' \t1234.50\n', fx)).toEqual({ usd: '$1,234.50', jpy: '￥185,175' });
  });

  it('does not invent FX when missing', () => {
    expect(formatReferencePrice('1.25', null)).toEqual({ usd: '$1.25', jpy: null });
  });

  it.each([0, -1, NaN, Infinity, -Infinity])('retains USD for invalid FX rate %s', (jpyPerUsd) => {
    expect(formatReferencePrice('1.25', { ...fx, jpyPerUsd })).toEqual({ usd: '$1.25', jpy: null });
  });

  it.each(['', 'not-a-date', '2023-02-29', '1900-02-29', '2024-02-30', '2024-04-31', '2024-13-01', '2024-00-01', '2024-01-00', '2024-02-30T12:00:00Z', '2023-02-29T00:00:00+09:00'])('rejects invalid calendar date %j without dropping USD', (asOf) => {
    expect(formatReferencePrice('2.00', { ...fx, asOf })).toEqual({ usd: '$2.00', jpy: null });
  });

  it.each(['2000-02-29', '2024-02-29', '2024-02-29T12:30:45Z', '2024-02-29T12:30:45.123Z', '2024-02-29T23:30:00-05:00'])('accepts valid ISO date/timestamp %j', (asOf) => {
    expect(formatReferencePrice('2', { ...fx, asOf })).toEqual({ usd: '$2.00', jpy: '￥300' });
  });

  it.each([
    ['0.01', 49.9, '￥0'],
    ['0.01', 50, '￥1'],
    ['0.01', 50.1, '￥1'],
    ['0.07', 150, '￥11'],
    ['1.01', 50, '￥51'],
    ['100', 1.005, '￥101'],
  ])('rounds decimal USD %s times FX %s half-up', (usd, jpyPerUsd, jpy) => {
    expect(formatReferencePrice(usd, { ...fx, jpyPerUsd }).jpy).toBe(jpy);
  });

  it('accepts the largest safe USD cents magnitude', () => {
    expect(formatReferencePrice('90071992547409.91', null).usd).not.toBeNull();
  });

  it.each(['90071992547409.92', '90071992547410', '9999999999999999999999999999999999999999'])('rejects unsafe USD cents %s', (usd) => {
    expect(formatReferencePrice(usd, fx)).toEqual({ usd: null, jpy: null });
  });

  it('accepts the largest safe rounded JPY integer', () => {
    expect(formatReferencePrice('1', { ...fx, jpyPerUsd: Number.MAX_SAFE_INTEGER })).toEqual({ usd: '$1.00', jpy: '￥9,007,199,254,740,991' });
  });

  it.each([Number.MAX_SAFE_INTEGER + 1, Number.MAX_VALUE])('retains USD when only JPY overflows at FX %s', (jpyPerUsd) => {
    expect(formatReferencePrice('2', { ...fx, jpyPerUsd })).toEqual({ usd: '$2.00', jpy: null });
  });
});
