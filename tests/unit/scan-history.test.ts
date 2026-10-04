import { expect, test } from 'vitest';
import { ScanHistory } from '../../src/ui/scan-history-model.js';
import { card } from './fixtures.js';
test('accepted scan generation records once; independent deliberate rescan records again', () => {
  const h = new ScanHistory();
  h.accept(1, card, 'nonfoil'); h.accept(1, { ...card, id: 'frame' }, 'foil');
  expect(h.entries.map(x => x.card.id)).toEqual(['a']);
  h.accept(2, card, 'foil'); expect(h.entries.map(x => x.generation)).toEqual([2, 1]);
});
test('override updates only corresponding event without reordering; snapshots are isolated', () => {
  const h = new ScanHistory(); h.accept(1, card, 'nonfoil'); h.accept(2, card, 'nonfoil');
  h.update(1, { ...card, id: 'edition', lang: 'ja' }, 'foil');
  const entries = h.entries; entries[0]!.card.id = 'mutated';
  expect(h.entries.map(x => [x.generation, x.card.id, x.finish])).toEqual([[2, 'a', 'nonfoil'], [1, 'edition', 'foil']]);
});
test('bounded collection rejects late generations even after eviction; reset/browsing needs no mutation', () => {
  const h = new ScanHistory(2); for (let i = 1; i <= 4; i++) h.accept(i, card, 'nonfoil');
  h.accept(1, card, 'foil'); h.update(1, card, 'foil');
  expect(h.entries.map(x => x.generation)).toEqual([4, 3]);
  expect(() => new ScanHistory(0)).toThrow();
});
