import { expect, it } from 'vitest';
import { formatStatuses } from '../../src/ui/format-legality.js';
// SYNTHETIC Scryfall-shaped legalities, not observed provider data.
it('keeps the seven paper formats in order and never infers missing legality', () => {
  const rows = formatStatuses({ standard: 'legal', pioneer: 'banned', modern: 'not_legal', vintage: 'restricted', commander: 'unexpected' });
  expect(rows.map(row => row.key)).toEqual(['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'commander', 'pauper']);
  expect(rows.map(row => row.status)).toEqual(['legal', 'banned', 'not_legal', 'unknown', 'restricted', 'unknown', 'unknown']);
  expect(rows[4]!.explanation).toContain('1枚');
  expect(formatStatuses(undefined).every(row => row.status === 'unknown')).toBe(true);
  expect(formatStatuses({ modern: 'legal' })[0]!.status).toBe('unknown');
});

it('uses the exact compact Japanese badge labels in order', () => {
  expect(formatStatuses().map(row => row.badge)).toEqual(['スタン', 'パイオニア', 'モダン', 'レガシー', 'ヴィンテ', '統率者', 'パウパー']);
});
