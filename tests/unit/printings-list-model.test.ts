import { expect, it } from 'vitest';
import { PRINTINGS_INITIAL, visiblePrintings } from '../../src/ui/printings-list-model.js';
import { card } from './fixtures.js';
// SYNTHETIC printings; no provider evidence.
const many = (count: number) => Array.from({ length: count }, (_, index) => ({ ...card, id: `p${index}` }));
it('initially shows at most ten printings and counts the rest', () => {
  expect(PRINTINGS_INITIAL).toBe(10);
  const view = visiblePrintings(many(25), false);
  expect(view.shown.map(c => c.id)).toEqual(many(10).map(c => c.id));
  expect(view.hidden).toBe(15);
});
it('shows exactly ten printings without a remainder', () => {
  const view = visiblePrintings(many(10), false);
  expect(view.shown).toHaveLength(10);
  expect(view.hidden).toBe(0);
});
it('shows eleven printings as ten plus one hidden', () => {
  const view = visiblePrintings(many(11), false);
  expect(view.shown).toHaveLength(10);
  expect(view.hidden).toBe(1);
});
it('reveals every printing once expanded and handles empty lists', () => {
  const view = visiblePrintings(many(25), true);
  expect(view.shown).toHaveLength(25);
  expect(view.hidden).toBe(0);
  expect(visiblePrintings([], false)).toEqual({ shown: [], hidden: 0 });
});
it('does not mutate or alias the input list', () => {
  const input = many(12);
  const view = visiblePrintings(input, true);
  view.shown.pop();
  expect(input).toHaveLength(12);
});
// Language filter: only Japanese and English printings are listed.
import { japaneseOrEnglish } from '../../src/ui/printings-list-model.js';
const langs = (...codes: string[]) => codes.map((lang, index) => ({ ...card, id: `l${index}-${lang}`, lang }));
it('keeps only ja and en printings in their original order', () => {
  const kept = japaneseOrEnglish(langs('de', 'en', 'fr', 'ja', 'zhs', 'zht', 'en'));
  expect(kept.map(c => c.lang)).toEqual(['en', 'ja', 'en']);
});
it('returns an empty list when no printing is ja or en and does not mutate the input', () => {
  const input = langs('de', 'fr');
  expect(japaneseOrEnglish(input)).toEqual([]);
  expect(input).toHaveLength(2);
});
it('paginates after the language filter', () => {
  const mixed = Array.from({ length: 30 }, (_, i) => ({ ...card, id: `m${i}`, lang: i % 3 === 0 ? 'de' : 'en' }));
  const view = visiblePrintings(japaneseOrEnglish(mixed), false);
  expect(view.shown).toHaveLength(10);
  expect(view.hidden).toBe(10);
});
