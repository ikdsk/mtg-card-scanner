import { JsonClient, ProviderError } from './http.js';
import type { Card } from './cards.js';
import type { FxRate } from '../domain/pricing.js';
import { formatReferencePrice } from '../domain/pricing.js';
const API = 'https://api.scryfall.com';
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ProviderError('応答の形式が不正です');
  return value as Record<string, unknown>;
}
// Most layouts carry oracle_id at the top level. Some (notably reversible_card, e.g. recent
// "Card // Card" reprints) carry only null at the top level with the real id on each face;
// every face shares the same oracle_id in that case, so the first face is sufficient.
function resolveOracleId(c: Record<string, unknown>): string {
  if (typeof c.oracle_id === 'string') return c.oracle_id;
  const faces = c.card_faces;
  if (Array.isArray(faces) && faces.length > 0) {
    const first = faces[0];
    if (typeof first === 'object' && first !== null && typeof (first as Record<string, unknown>).oracle_id === 'string') {
      return (first as Record<string, unknown>).oracle_id as string;
    }
  }
  throw new ProviderError('カード情報が不正です');
}
export function parseCard(value: unknown): Card {
  const c = object(value);
  for (const key of ['id', 'name', 'lang', 'set', 'set_name', 'collector_number']) if (typeof c[key] !== 'string') throw new ProviderError('カード情報が不正です');
  const oracleId = resolveOracleId(c);
  if (!Array.isArray(c.finishes) || !c.finishes.every(x => typeof x === 'string')) throw new ProviderError('加工情報が不正です');
  object(c.prices); object(c.legalities);
  if (!Object.values(c.prices as object).every(v => v === null || typeof v === 'string')) throw new ProviderError('価格情報が不正です');
  if (!Object.values(c.legalities as object).every(v => typeof v === 'string')) throw new ProviderError('使用可否情報が不正です');
  const faces = c.card_faces ?? [c];
  if (!Array.isArray(faces)) throw new ProviderError('カード面情報が不正です');
  for (const f of faces) {
    const face = object(f);
    if (typeof face.name !== 'string') throw new ProviderError('カード面情報が不正です');
    for (const k of ['printed_name', 'printed_text', 'oracle_text', 'type_line', 'printed_type_line', 'mana_cost']) if (face[k] !== undefined && typeof face[k] !== 'string') throw new ProviderError('カード本文が不正です');
  }
  return { ...c, oracle_id: oracleId } as unknown as Card;
}
export function parseFx(value: unknown): FxRate {
  const d = object(value);
  const fx = { jpyPerUsd: d.rate as number, asOf: d.date as string };
  if (d.base !== 'USD' || d.quote !== 'JPY' || typeof fx.asOf !== 'string' || typeof fx.jpyPerUsd !== 'number' || !formatReferencePrice('1', fx).jpy) throw new ProviderError('為替情報が不正です');
  return fx;
}
export class Repository {
  constructor(private readonly http = new JsonClient()) {}
  card(id: string, signal?: AbortSignal): Promise<Card> { return this.http.get(`${API}/cards/${encodeURIComponent(id)}`, signal, value => { const c = parseCard(value); if (c.id !== id) throw new ProviderError('カードの対象が一致しません'); return c; }); }
  async search(query: string, signal?: AbortSignal): Promise<{ cards: Card[]; next: string | null }> {
    const q = new URLSearchParams({ q: query.trim(), unique: 'cards', include_multilingual: 'true', order: 'name' });
    return this.page(`${API}/cards/search?${q}`, signal);
  }
  async page(url: string, signal?: AbortSignal, oracleId?: string): Promise<{ cards: Card[]; next: string | null }> {
    const u = new URL(url);
    if (u.origin !== API || u.pathname !== '/cards/search') throw new ProviderError('不正なページURLです');
    return this.http.get(url, signal, value => {
      const data = object(value);
      if (!Array.isArray(data.data)) throw new ProviderError('検索情報が不正です');
      const cards = data.data.map(parseCard);
      if (oracleId && cards.some(card => card.oracle_id !== oracleId)) throw new ProviderError('版一覧の対象が一致しません');
      return { cards, next: data.has_more === true && typeof data.next_page === 'string' ? data.next_page : null };
    });
  }
  async printings(oracleId: string, signal?: AbortSignal): Promise<Card[]> {
    const q = new URLSearchParams({ q: `oracleid:${oracleId} game:paper`, unique: 'prints', include_multilingual: 'true', order: 'released' });
    let next: string | null = `${API}/cards/search?${q}`;
    const cards: Card[] = [];
    const seen = new Set<string>();
    while (next) {
      if (seen.has(next)) throw new ProviderError('ページ応答が循環しています');
      seen.add(next);
      const page = await this.page(next, signal, oracleId);
      cards.push(...page.cards); next = page.next;
    }
    return cards;
  }
}
export const FX_URL = 'https://api.frankfurter.dev/v2/providers/ecb/rate/USD/JPY';
export class FxProvider {
  constructor(private readonly http = new JsonClient(fetch, 0, 3_600_000)) {}
  async latest(signal?: AbortSignal): Promise<FxRate> { return this.http.get(FX_URL, signal, parseFx); }
}
