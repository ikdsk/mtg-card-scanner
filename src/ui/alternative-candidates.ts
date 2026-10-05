import type { Card } from '../data/cards.js';
import type { Suggestion } from '../recognition/live-candidate.js';
export type CandidateEntry = { suggestion: Suggestion; card: Card };
export type AlternativeCandidate = { cardId: string; score: number; card: Card; current: boolean };
// TODO: scanner.worker.mjs search() returns a single best match, so `others` is
// always empty today. Once the worker returns top-N candidates, pass the
// verified extras here and the list UI shows several candidates unchanged.
export function alternativeCandidates(current: CandidateEntry, others: readonly CandidateEntry[] = []): AlternativeCandidate[] {
  const seen = new Set<string>();
  const entries = [current, ...others].filter(entry => !seen.has(entry.suggestion.cardId) && seen.add(entry.suggestion.cardId));
  return entries
    .map(entry => ({ cardId: entry.suggestion.cardId, score: entry.suggestion.score, card: structuredClone(entry.card), current: entry.suggestion.cardId === current.suggestion.cardId }))
    .sort((a, b) => b.score - a.score);
}
