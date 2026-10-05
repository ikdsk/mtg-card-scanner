import { manifest } from './manifest.js';
import type { Candidate } from './gate.js';
// Next-best distinct Oracle identities from the worker's search, lightweight data only.
export type RecognitionAlternative = { cardId: string; score: number; faceIndex: number; cardName: string | null; secondaryId: string | null; secondaryIdField: string | null };
export type RecognitionResult = Candidate & { margin: number; alternatives: RecognitionAlternative[]; corners?: unknown; scryfallOracleId?: string; timing?: Record<string, number> };
export function normalizeAlternatives(value: unknown): RecognitionAlternative[] {
  if (!Array.isArray(value)) return [];
  const out: RecognitionAlternative[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const x = item as Record<string, unknown>;
    if (typeof x.cardId !== 'string' || !x.cardId || typeof x.score !== 'number' || !Number.isFinite(x.score)) continue;
    out.push({ cardId: x.cardId, score: x.score, faceIndex: x.faceIndex === 1 ? 1 : 0, cardName: typeof x.cardName === 'string' ? x.cardName : null, secondaryId: typeof x.secondaryId === 'string' ? x.secondaryId : null, secondaryIdField: typeof x.secondaryIdField === 'string' ? x.secondaryIdField : null });
  }
  return out;
}
export class Recognizer {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private waiting: { resolve: (r: RecognitionResult) => void; reject: (e: Error) => void } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private rejectReady: ((e: Error) => void) | null = null;
  private lease: symbol | null = null;
  constructor(private readonly progress: (message: string) => void) {}
  init(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      this.rejectReady = reject;
      this.progress('認識データを準備中（初回 約45MB＋実行環境）');
      const local = new URL(location.href).searchParams.has('localAssets');
      const w = new Worker(`/recognition/scanner.worker.mjs${local ? '?local' : ''}`, { type: 'module' }); this.worker = w;
      const fail = (error: Error) => { if (w !== this.worker) return; reject(error); this.waiting?.reject(error); this.waiting = null; this.dispose(); };
      this.timer = setTimeout(() => fail(new Error('認識の準備がタイムアウトしました。再試行または名前検索を利用してください。')), 180000);
      w.onerror = () => fail(new Error('認識モデルを読み込めません。接続を確認して再試行してください。'));
      w.onmessage = ({ data }) => {
        if (w !== this.worker) return;
        if (data.type === 'progress') {
          const stage = { detector: '四隅検出モデル', embedder: 'カード認識モデル', catalog: 'カード辞書' }[data.stage as string] ?? '実行環境';
          this.progress(`${stage}を準備中${data.total > 0 ? ` ${Math.round(data.ratio * 100)}%` : ''}${data.cached ? '（キャッシュ）' : ''}`);
        } else if (data.type === 'ready') {
          this.rejectReady = null;
          if (this.timer) clearTimeout(this.timer); this.timer = null;
          this.progress(`端末内認識の準備完了 · WASM · 辞書 v${data.catalogVersion}${data.catalogFallback ? '（更新失敗のため互換キャッシュを使用）' : ''}`); resolve();
        } else if (data.type === 'result') {
          if (this.timer) clearTimeout(this.timer); this.timer = null;
          this.waiting?.resolve({ ...data, alternatives: normalizeAlternatives(data.alternatives) } as RecognitionResult); this.waiting = null;
        } else if (data.type === 'error') fail(new Error(String(data.message)));
      };
      w.postMessage({ type: 'init', manifest, catalogMode: 'v2', enableWebGpu: false, rotationInvariant: true });
    });
    return this.ready;
  }
  async frame(bitmap: ImageBitmap): Promise<RecognitionResult> {
    if (this.lease) { bitmap.close(); throw new Error('認識処理中です'); }
    const lease = Symbol(); this.lease = lease;
    let transferred = false;
    try {
      await this.init();
      if (!this.worker || this.lease !== lease) throw new Error('認識が停止しました');
      return await new Promise((resolve, reject) => {
        this.waiting = { resolve, reject };
        this.timer = setTimeout(() => { const e = new Error('認識がタイムアウトしました'); this.waiting?.reject(e); this.waiting = null; this.dispose(); }, 30000);
        this.worker!.postMessage({ type: 'frame', bitmap }, [bitmap]); transferred = true;
      });
    } catch (error) {
      if (this.lease === lease) this.dispose();
      throw error;
    } finally { if (!transferred) bitmap.close(); if (this.lease === lease) this.lease = null; }
  }
  dispose(): void {
    this.lease = null;
    this.rejectReady?.(new Error('認識の準備を中止しました')); this.rejectReady = null;
    if (this.timer) clearTimeout(this.timer); this.timer = null;
    this.worker?.terminate(); this.worker = null; this.ready = null;
    this.waiting?.reject(new Error('認識を中止しました')); this.waiting = null;
  }
}
