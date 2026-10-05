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
test('continuous acceptance reserves each event before delayed metadata; superseded events remain truthful (SYNTHETIC)', () => {
 const h = new ScanHistory(); h.reserve(1,'a'); h.reserve(2,'b'); h.fail(1,'情報取得を中断しました');
 h.accept(2,{...card,id:'b'},'nonfoil');
 expect(h.allEntries.map(x=>x.generation)).toEqual([2,1]);
 expect(h.allEntries[1]).toMatchObject({card:null,cardId:'a',status:'情報取得を中断しました'});
});
test('accepted event retains the recognized DFC face for read-only reopening; update keeps it only for the same printing', () => {
  const h = new ScanHistory(); h.accept(1, card, 'nonfoil', 1); h.accept(2, card, 'nonfoil');
  expect(h.entries.map(x => [x.generation, x.faceIndex])).toEqual([[2, undefined], [1, 1]]);
  h.update(1, card, 'foil'); expect(h.entries[1]).toMatchObject({ finish: 'foil', faceIndex: 1 });
  h.update(1, { ...card, id: 'other' }, 'foil'); expect(h.entries[1]!.faceIndex).toBeUndefined();
});
