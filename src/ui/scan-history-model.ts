import type { Card } from '../data/cards.js';
export type ScanHistoryEntry = { generation: number; card: Card; finish: string; faceIndex?: number | undefined };
export type PendingScanHistoryEntry = { generation: number; card: null; cardId: string; status: string };
// Tab-only public metadata snapshots. No image pixels, files or embeddings; rows never show prices.
export class ScanHistory {
  private items: ScanHistoryEntry[] = [];
  private pending: PendingScanHistoryEntry[] = [];
  private latestGeneration = -1;
  constructor(readonly limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid history limit');
  }
  get entries(): ScanHistoryEntry[] { return structuredClone(this.items); }
  get allEntries(): (ScanHistoryEntry | PendingScanHistoryEntry)[] { return structuredClone([...this.items, ...this.pending].sort((a,b)=>b.generation-a.generation).slice(0,this.limit)); }
  reserve(generation: number, cardId: string): void {
    if (generation <= this.latestGeneration) return;
    this.latestGeneration = generation;
    this.pending = [{generation, card: null, cardId, status: 'カード情報を取得中…'}, ...this.pending];
    this.trim();
  }
  fail(generation: number, status: string): void { this.pending = this.pending.map(x=>x.generation===generation ? {...x,status}:x); }
  private trim(): void {
    const retained = new Set(this.allEntries.map(x=>x.generation));
    this.items = this.items.filter(x=>retained.has(x.generation)); this.pending = this.pending.filter(x=>retained.has(x.generation));
  }
  update(generation: number, card: Card, finish: string): void {
    this.items = this.items.map(entry => entry.generation === generation ? { generation, card: structuredClone(card), finish, ...(entry.card.id === card.id && entry.faceIndex !== undefined ? { faceIndex: entry.faceIndex } : {}) } : entry);
  }
  // faceIndex is the recognized DFC face; read-only reopening starts on that face.
  accept(generation: number, card: Card, finish: string, faceIndex?: number): void {
    if (generation <= this.latestGeneration && !this.pending.some(x=>x.generation===generation)) return;
    this.latestGeneration = Math.max(this.latestGeneration, generation);
    this.pending = this.pending.filter(x=>x.generation!==generation);
    this.items = [{ generation, card: structuredClone(card), finish, ...(faceIndex === undefined ? {} : { faceIndex }) }, ...this.items].sort((a,b)=>b.generation-a.generation);
    this.trim();
  }
}
