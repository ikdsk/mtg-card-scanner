import { expect, it, vi } from 'vitest';
import { JsonClient, ProviderError } from '../../src/data/http.js';
import { Repository, FxProvider, parseFx, parseCard } from '../../src/data/repository.js';
import type { Card } from '../../src/data/cards.js';
import { card } from './fixtures.js';
it('retrieves every printing page, preserving exact language IDs (SYNTHETIC)', async () => {
  const calls: string[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify(calls.length === 1 ? { data: [card], has_more: true, next_page: 'https://api.scryfall.com/cards/search?page=2' } : { data: [{ ...card, id: 'ja-id', lang: 'ja' }], has_more: false }));
  });
  const repo = new Repository(new JsonClient(fetcher as typeof fetch, 0));
  expect((await repo.printings('o')).map(c => c.id)).toEqual(['a', 'ja-id']); expect(calls).toHaveLength(2);
  expect(calls[0]).toContain('include_multilingual=true'); expect(calls[0]).toContain('unique=prints');
});
it('never follows a pagination URL to another origin (SYNTHETIC)', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [card], has_more: true, next_page: 'https://evil.example/cards/search' })));
  await expect(new Repository(new JsonClient(fetcher as typeof fetch, 0)).printings('o')).rejects.toThrow('不正なページURL'); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects invalid FX and currency direction; valid provider-shaped zero prices survive (SYNTHETIC)', () => {
  expect(parseFx({ base: 'USD', quote: 'JPY', rate: 150, date: '2026-10-02' })).toEqual({ jpyPerUsd: 150, asOf: '2026-10-02' });
  for (const bad of [{ base: 'JPY', quote: 'USD', rate: 150, date: '2026-10-02' }, { base: 'USD', quote: 'JPY', rate: 0, date: '2026-10-02' }, { base: 'USD', quote: 'JPY', rate: 150, date: '2026-02-30' }]) expect(() => parseFx(bad)).toThrow();
  expect(parseCard(card).prices.usd).toBe('0.00'); expect(() => parseCard({ ...card, prices: { usd: 4 } })).toThrow();
});
it('resolves oracle_id from the first face when the top-level field is missing (SYNTHETIC reversible_card shape)', () => {
  // Real Scryfall shape for reversible_card reprints (e.g. "Overgrown Tomb // Overgrown Tomb",
  // Edge of Eternities Commander #350): top-level oracle_id is null, both faces carry the real id.
  const { oracle_id: _drop, ...withoutTop } = card as Card & { oracle_id: string };
  const reversible = { ...withoutTop, oracle_id: null, layout: 'reversible_card', card_faces: [{ name: 'Overgrown Tomb', oracle_id: card.oracle_id }, { name: 'Overgrown Tomb', oracle_id: card.oracle_id }] };
  expect(parseCard(reversible).oracle_id).toBe(card.oracle_id);
});
it('still rejects a card with no resolvable oracle_id anywhere (SYNTHETIC)', () => {
  const { oracle_id: _drop, ...withoutTop } = card as Card & { oracle_id: string };
  expect(() => parseCard({ ...withoutTop, oracle_id: null })).toThrow('カード情報が不正です');
});
it('caches successful metadata, rejects abort even on cache hit, and never retries 429 automatically (SYNTHETIC)', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ value: 0 })));
  const http = new JsonClient(fetcher as typeof fetch, 0);
  await http.get('https://api.scryfall.com/cards/a'); await http.get('https://api.scryfall.com/cards/a'); expect(fetcher).toHaveBeenCalledTimes(1);
  const abort = new AbortController(); abort.abort(); await expect(http.get('https://api.scryfall.com/cards/a', abort.signal)).rejects.toThrow();
  const limited = vi.fn(async () => new Response('{}', { status: 429 }));
  await expect(new JsonClient(limited as typeof fetch, 0).get('https://api.scryfall.com/cards/a')).rejects.toBeInstanceOf(ProviderError); expect(limited).toHaveBeenCalledTimes(1);
});
it('does not fetch a request cancelled while waiting in the rate-limit queue (SYNTHETIC)', async () => {
  let release!: (r: Response) => void;
  const fetcher = vi.fn(() => new Promise<Response>(resolve => { release = resolve; }));
  const http = new JsonClient(fetcher as typeof fetch, 0);
  const first = http.get('https://api.scryfall.com/cards/a'); await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  const abort = new AbortController(); const second = http.get('https://api.scryfall.com/cards/b', abort.signal); abort.abort();
  release(new Response('{}')); await first; await expect(second).rejects.toThrow(); expect(fetcher).toHaveBeenCalledTimes(1);
});

it('invokes injected transport without a JsonClient receiver (SYNTHETIC browser fetch contract)', async () => {
  const transport = function (this: unknown) {
    if (this !== undefined) throw new TypeError('Illegal invocation');
    return Promise.resolve(new Response('{"ok":true}'));
  };
  await expect(new JsonClient(transport as typeof fetch, 0).get('https://api.scryfall.com/cards/a')).resolves.toEqual({ ok: true });
});
it('invalid HTTP200 card responses do not poison retry caches (SYNTHETIC)', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{"id":"malformed"}')).mockResolvedValueOnce(new Response(JSON.stringify(card)));
  const repo = new Repository(new JsonClient(fetcher as typeof fetch, 0));
  await expect(repo.card('a')).rejects.toThrow();
  await expect(repo.card('a')).resolves.toEqual(card);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('rejects mismatched card and printing identities without caching them (SYNTHETIC)', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ...card, id: 'other' }))).mockResolvedValueOnce(new Response(JSON.stringify(card)));
  const repo = new Repository(new JsonClient(fetcher as typeof fetch, 0));
  await expect(repo.card('a')).rejects.toThrow('対象が一致しません');
  await expect(repo.card('a')).resolves.toEqual(card);
  const pages = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ ...card, oracle_id: 'other' }], has_more: false }))).mockResolvedValueOnce(new Response(JSON.stringify({ data: [card], has_more: false })));
  const printRepo = new Repository(new JsonClient(pages as typeof fetch, 0));
  await expect(printRepo.printings(card.oracle_id)).rejects.toThrow('対象が一致しません');
  await expect(printRepo.printings(card.oracle_id)).resolves.toEqual([card]);
  expect(pages).toHaveBeenCalledTimes(2);
});
it('paces Scryfall search starts at least 500ms apart (SYNTHETIC fake clock)', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
  try {
    const starts: number[] = [];
    const fetcher = vi.fn(async () => { starts.push(Date.now()); return new Response('{}'); });
    const http = new JsonClient(fetcher as typeof fetch);
    const a = http.get('https://api.scryfall.com/cards/search?q=a');
    const b = http.get('https://api.scryfall.com/cards/search?q=b');
    await vi.runAllTimersAsync(); await Promise.all([a, b]);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(500);
  } finally { vi.useRealTimers(); }
});
it('shares 429 cooldown across clients and honors Retry-After (SYNTHETIC fake clock)', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
  try {
    const starts: number[] = [];
    const fetcher = vi.fn(async () => { starts.push(Date.now()); return starts.length === 1 ? new Response('{}', { status: 429, headers: { 'Retry-After': '35' } }) : new Response('{}'); });
    const first = new JsonClient(fetcher as typeof fetch);
    const second = new JsonClient(fetcher as typeof fetch);
    await expect(first.get('https://api.scryfall.com/cards/a')).rejects.toBeInstanceOf(ProviderError);
    const retry = second.get('https://api.scryfall.com/cards/b');
    await vi.runAllTimersAsync(); await retry;
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(35000);
  } finally { vi.useRealTimers(); }
});
it('shares search pacing and promptly aborts cooldown waits without a fetch (SYNTHETIC fake clock)', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
  try {
    const starts: number[] = [];
    const fetcher = vi.fn(async () => { starts.push(Date.now()); return new Response('{}'); });
    const a = new JsonClient(fetcher as typeof fetch).get('https://api.scryfall.com/cards/search?q=a');
    const b = new JsonClient(fetcher as typeof fetch).get('https://api.scryfall.com/cards/search?q=b');
    await vi.runAllTimersAsync(); await Promise.all([a, b]);
    expect(starts[1]! - starts[0]!).toBeGreaterThanOrEqual(500);
    const limited = vi.fn(async () => new Response('{}', { status: 429 }));
    const http = new JsonClient(limited as typeof fetch);
    await expect(http.get('https://api.scryfall.com/cards/a')).rejects.toThrow();
    const abort = new AbortController();
    const retry = http.get('https://api.scryfall.com/cards/b', abort.signal);
    const outcome = expect(retry).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(100);
    abort.abort(); await outcome;
    expect(limited).toHaveBeenCalledTimes(1);
  } finally { vi.useRealTimers(); }
});
it('aborts a request queued behind another cooldown waiter immediately (SYNTHETIC fake clock)', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
  try {
    const transport = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429 })).mockImplementation(async () => new Response('{}'));
    const http = new JsonClient(transport as typeof fetch);
    await expect(http.get('https://api.scryfall.com/cards/a')).rejects.toThrow();
    const waiting = http.get('https://api.scryfall.com/cards/b');
    const controller = new AbortController(); let aborted = false;
    const cancelled = http.get('https://api.scryfall.com/cards/c', controller.signal).catch(() => { aborted = true; });
    await vi.advanceTimersByTimeAsync(100); controller.abort();
    await vi.advanceTimersByTimeAsync(1);
    const immediate = aborted;
    await vi.runAllTimersAsync(); await Promise.all([waiting, cancelled]);
    expect(immediate).toBe(true);
    expect(transport).toHaveBeenCalledTimes(2);
  } finally { vi.useRealTimers(); }
});
it('retries malformed FX and search HTTP200 responses instead of caching errors (SYNTHETIC)', async () => {
  const fxTransport = vi.fn().mockResolvedValueOnce(new Response('{"base":"JPY","quote":"USD","rate":150,"date":"2026-10-02"}')).mockResolvedValueOnce(new Response('{"base":"USD","quote":"JPY","rate":150,"date":"2026-10-02"}'));
  const fx = new FxProvider(new JsonClient(fxTransport as typeof fetch, 0));
  await expect(fx.latest()).rejects.toThrow('為替情報が不正です');
  await expect(fx.latest()).resolves.toEqual({ jpyPerUsd: 150, asOf: '2026-10-02' });
  expect(fxTransport).toHaveBeenCalledTimes(2);
  const searchTransport = vi.fn().mockResolvedValueOnce(new Response('{"data":[{}]}')).mockResolvedValueOnce(new Response(JSON.stringify({ data: [card], has_more: false })));
  const repo = new Repository(new JsonClient(searchTransport as typeof fetch, 0));
  await expect(repo.search('fixture')).rejects.toThrow();
  await expect(repo.search('fixture')).resolves.toEqual({ cards: [card], next: null });
  expect(searchTransport).toHaveBeenCalledTimes(2);
});
