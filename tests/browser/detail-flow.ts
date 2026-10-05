import type { Page } from '@playwright/test';
// SYNTHETIC canvas camera, worker results and provider metadata. Not model accuracy evidence.
export const img = (name: string) => `https://cards.scryfall.io/normal/${name}.jpg`;
export const a = { id: 'alt-a', oracle_id: 'oracle-a', name: 'Synthetic Alpha', lang: 'en', set: 'tst', set_name: 'Synthetic', collector_number: '1', finishes: ['nonfoil', 'foil'], prices: { usd: '1', usd_foil: '2' }, legalities: { modern: 'legal' }, oracle_text: 'Alpha oracle rules text', type_line: 'Instant', mana_cost: '{R}', image_uris: { small: img('a-small'), normal: img('a') } };
export const beta = { ...a, id: 'alt-beta', set: 'bbb', set_name: 'Beta Edition', collector_number: '7', prices: { usd: '3', usd_foil: '4' }, legalities: { vintage: 'banned' }, image_uris: { small: img('beta-small'), normal: img('beta') } };
export const ja = { ...a, id: 'alt-ja', lang: 'ja', set: 'jpn', set_name: 'Japanese Edition', collector_number: '5', printed_name: '合成アルファ', printed_text: '合成の日本語印刷本文', prices: { usd: '9' }, image_uris: { small: img('ja-small'), normal: img('ja') } };
export const gamma = { ...a, id: 'alt-gamma', oracle_id: 'oracle-gamma', name: 'Synthetic Gamma' };
export const delta = { ...a, id: 'alt-delta', oracle_id: 'oracle-delta', name: 'Synthetic Delta', set: 'ddd', set_name: 'Delta Edition', collector_number: '9', image_uris: { small: img('delta-small'), normal: img('delta') } };
export type SyntheticAlternative = { cardId: string; score: number; faceIndex?: number; secondaryId?: string };
export function manyPrintings(count: number) {
  return Array.from({ length: count }, (_, index) => index === 0 ? a : { ...a, id: `alt-p${index}`, set: `p${index}`, set_name: `Printing ${index}`, collector_number: String(index), prices: { usd: `${index + 1}`, usd_foil: null }, image_uris: { small: img(`p${index}-small`), normal: img(`p${index}`) } });
}
export type FlowOptions = { printings?: unknown[]; fx?: boolean; delayPrintings?: Promise<void>; alternatives?: SyntheticAlternative[]; cardRequests?: string[] };
export async function installFlow(page: Page, options: FlowOptions = {}) {
  const printings = options.printings ?? [a, beta, ja];
  await page.addInitScript((alternatives: SyntheticAlternative[]) => {
    const state = { id: 'alt-a', oracle: 'oracle-a', present: true, cornersValid: true, frames: 0, score: .623, margin: .01, latency: 10 };
    Object.assign(window, { probe: state });
    navigator.mediaDevices.getUserMedia = async () => { const c = document.createElement('canvas'); c.width = 1280; c.height = 720; c.getContext('2d')!.fillRect(0, 0, 1280, 720); return c.captureStream(5); };
    class SyntheticWorker {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      postMessage(data: { type: string; bitmap?: ImageBitmap }) {
        data.bitmap?.close(); if (data.type === 'frame') state.frames++;
        const snapshot = { ...state };
        setTimeout(() => this.onmessage?.({ data: data.type === 'init' ? { type: 'ready', catalogVersion: 52 } : { type: 'result', cardId: snapshot.id, scryfallOracleId: snapshot.oracle, cardPresent: snapshot.present, cornersValid: snapshot.present && snapshot.cornersValid, corners: [[.1, .1], [.9, .1], [.9, .9], [.1, .9]], score: snapshot.score, margin: snapshot.margin, alternatives: snapshot.id === 'alt-a' ? alternatives : [] } }), data.type === 'init' ? 10 : snapshot.latency);
      }
      terminate() {}
    }
    Object.defineProperty(window, 'Worker', { value: SyntheticWorker });
  }, options.alternatives ?? []);
  const registry = [...printings as { id: string }[], a, beta, ja, gamma, delta];
  await page.route('https://api.scryfall.com/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/search')) {
      const q = url.searchParams.get('q') ?? '';
      if (q.startsWith('oracleid:')) { await options.delayPrintings; return route.fulfill({ json: { data: q.includes('oracle-gamma') ? [gamma] : printings, has_more: false } }).catch(() => {}); }
      return route.fulfill({ json: { data: [a], has_more: false } });
    }
    if (url.pathname.startsWith('/sets/')) return route.fulfill({ status: 404, json: {} });
    options.cardRequests?.push(url.pathname.split('/').pop()!);
    const found = registry.find(card => url.pathname.endsWith('/' + card.id));
    return route.fulfill(found ? { json: found } : { status: 404, json: {} });
  });
  await page.route('https://cards.scryfall.io/**', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="68"><rect width="48" height="68" fill="#526685"/></svg>' }));
  await page.route('https://api.frankfurter.dev/**', r => options.fx === false ? r.fulfill({ status: 503, json: {} }) : r.fulfill({ json: { base: 'USD', quote: 'JPY', rate: 150, date: '2026-10-02' } }));
}
