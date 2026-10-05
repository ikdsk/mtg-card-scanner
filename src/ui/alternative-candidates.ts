import type { Card } from '../data/cards.js';
import type { Suggestion } from '../recognition/live-candidate.js';
export type CandidateEntry = { suggestion: Suggestion; card: Card };
export type AlternativeCandidate = { cardId: string; identity: string; faceIndex: number; score: number; card: Card; current: boolean };
// The worker's search returns the top Oracle identities of each frame. `others` are the
// extra candidates whose Scryfall card has been fetched and verified (unverified ones are
// never passed in). Entries are unique per card and per identity; the current one stays
// flagged and the list is ordered by similarity.
export function alternativeCandidates(current: CandidateEntry, others: readonly CandidateEntry[] = []): AlternativeCandidate[] {
  const cards = new Set<string>(); const identities = new Set<string>();
  const entries = [current, ...others].filter(entry => {
    if (cards.has(entry.suggestion.cardId) || identities.has(entry.suggestion.identity)) return false;
    cards.add(entry.suggestion.cardId); identities.add(entry.suggestion.identity); return true;
  });
  return entries
    .map(entry => ({ cardId: entry.suggestion.cardId, identity: entry.suggestion.identity, faceIndex: entry.suggestion.faceIndex, score: entry.suggestion.score, card: structuredClone(entry.card), current: entry.suggestion.cardId === current.suggestion.cardId }))
    .sort((a, b) => b.score - a.score);
}
