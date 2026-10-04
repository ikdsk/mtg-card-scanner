import { initialSelection, nextScan, overrideSelection, requestToken, acceptsResponse } from '../domain/selection.js';
import { finishPrice } from '../data/cards.js';
import type { Card } from '../data/cards.js';
import type { FxRate } from '../domain/pricing.js';
export type ResultState = { card: Card | null; finish: string; quote: string | null; fx: FxRate | null; loading: boolean; error: string | null; retrievedAt: string | null; fxError: boolean };
export class ResultSession {
  private request: AbortController | null = null;
  selection = initialSelection();
  value: ResultState = { card: null, finish: '', quote: null, fx: null, loading: false, error: null, retrievedAt: null, fxError: false };
  constructor(private readonly load: (id: string, signal: AbortSignal) => Promise<Card>, private readonly fx: (signal: AbortSignal) => Promise<FxRate>, private readonly changed: () => void) {}
  reset(): void {
    this.request?.abort(); this.request = null; this.selection = nextScan(this.selection);
    this.value = { card: null, finish: '', quote: null, fx: null, loading: false, error: null, retrievedAt: null, fxError: false }; this.changed();
  }
  async select(card: Card, finish: string): Promise<void> {
    this.request?.abort();
    const request = new AbortController(); this.request = request;
    this.selection = overrideSelection(this.selection, { oracleId: card.oracle_id, printingId: card.id, language: card.lang, finish });
    const token = requestToken(this.selection);
    this.value = { card, finish, quote: null, fx: null, loading: true, error: null, retrievedAt: null, fxError: false }; this.changed();
    // FX is independent of the card request; failure keeps truthful USD-only output.
    const rate = this.fx(request.signal).then(fx => ({ fx, failed: false })).catch(() => ({ fx: null, failed: true }));
    try {
      const fresh = await this.load(card.id, request.signal);
      if (!acceptsResponse(this.selection, token)) return;
      if (fresh.id !== card.id || fresh.lang !== card.lang || fresh.oracle_id !== card.oracle_id) throw new Error('取得した価格の対象が一致しません');
      this.value = { ...this.value, card: fresh, quote: finishPrice(fresh, finish), loading: false, retrievedAt: new Date().toISOString() }; this.changed();
      const fx = await rate;
      if (!acceptsResponse(this.selection, token)) return;
      this.value = { ...this.value, fx: fx.fx, fxError: fx.failed }; this.changed();
    } catch (error) {
      if (!acceptsResponse(this.selection, token)) return;
      this.value = { ...this.value, loading: false, error: error instanceof Error ? error.message : '取得できません' }; this.changed();
      const fx = await rate;
      if (!acceptsResponse(this.selection, token)) return;
      this.value = { ...this.value, fx: fx.fx, fxError: fx.failed }; this.changed();
    }
  }
}
