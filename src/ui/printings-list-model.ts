import type { Card } from '../data/cards.js';
export const PRINTINGS_INITIAL = 10;
// First ten printings until the reader asks for more; no printing is dropped.
export function visiblePrintings(cards: readonly Card[], expanded: boolean): { shown: Card[]; hidden: number } {
  const shown = expanded ? [...cards] : cards.slice(0, PRINTINGS_INITIAL);
  return { shown, hidden: cards.length - shown.length };
}
// The list offers Japanese and English printings only; other languages are never shown.
export function japaneseOrEnglish(cards: readonly Card[]): Card[] {
  return cards.filter(card => card.lang === 'ja' || card.lang === 'en');
}
