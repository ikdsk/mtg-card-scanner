import type { Card } from '../data/cards.js';
export type ScanHistoryEntry = { generation: number; card: Card; finish: string };
// Tab-only public metadata snapshots. No image pixels, files or embeddings; rows never show prices.
export class ScanHistory {
  private items: ScanHistoryEntry[] = [];
  private latestGeneration = -1;
  constructor(readonly limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid history limit');
  }
  get entries(): ScanHistoryEntry[] { return structuredClone(this.items); }
  update(generation: number, card: Card, finish: string): void {
    this.items = this.items.map(entry => entry.generation === generation ? { generation, card: structuredClone(card), finish } : entry);
  }
  accept(generation: number, card: Card, finish: string): void {
    if (generation <= this.latestGeneration) return;
    this.latestGeneration = generation;
    this.items = [{ generation, card: structuredClone(card), finish }, ...this.items].slice(0, this.limit);
  }
}
