import { expect, it } from 'vitest';
import { alternativeCandidates } from '../../src/ui/alternative-candidates.js';
import { card } from './fixtures.js';
// SYNTHETIC candidates. The worker returns the best match plus up to four runner-up identities.
const suggestion = (cardId: string, score: number, version = 1) => ({ cardId, identity: `o-${cardId}`, version, faceIndex: 0, score });
it('lists exactly the one confirmed candidate when the worker supplies no others', () => {
  const list = alternativeCandidates({ suggestion: suggestion('a', .7), card: { ...card, id: 'a' } });
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({ cardId: 'a', score: .7, current: true });
});
it('orders extra candidates by similarity, keeps the current one flagged and drops duplicates', () => {
  const list = alternativeCandidates(
    { suggestion: suggestion('a', .6), card: { ...card, id: 'a' } },
    [{ suggestion: suggestion('b', .8, 2), card: { ...card, id: 'b' } }, { suggestion: suggestion('a', .6), card: { ...card, id: 'a' } }, { suggestion: suggestion('c', .55, 3), card: { ...card, id: 'c' } }],
  );
  expect(list.map(x => x.cardId)).toEqual(['b', 'a', 'c']);
  expect(list.filter(x => x.current).map(x => x.cardId)).toEqual(['a']);
});
it('returns an isolated snapshot', () => {
  const source = { suggestion: suggestion('a', .7), card: { ...card, id: 'a' } };
  const list = alternativeCandidates(source);
  list.pop();
  expect(alternativeCandidates(source)).toHaveLength(1);
});
it('drops another printing of an identity that is already listed and carries face index and identity', () => {
  const list = alternativeCandidates(
    { suggestion: { ...suggestion('a', .6), identity: 'oracle-x', faceIndex: 1 }, card: { ...card, id: 'a' } },
    [{ suggestion: { ...suggestion('b', .8, 0), identity: 'oracle-x' }, card: { ...card, id: 'b' } }, { suggestion: { ...suggestion('c', .5, 0), identity: 'oracle-y', faceIndex: 1 }, card: { ...card, id: 'c' } }],
  );
  expect(list.map(x => x.cardId)).toEqual(['a', 'c']);
  expect(list.map(x => [x.identity, x.faceIndex])).toEqual([['oracle-x', 1], ['oracle-y', 1]]);
});
