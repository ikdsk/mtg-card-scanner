import { expect, it } from 'vitest';
import { referenceFaces, safeScryfallUrl } from '../../src/ui/reference-image.js';
import { card } from './fixtures.js';
// SYNTHETIC provider fields; no live recognition/provider evidence.
it('uses selected printing full-card image and validates remote URLs', () => {
  expect(referenceFaces({ ...card, image_uris: { normal: 'https://cards.scryfall.io/normal/front/test.jpg' } })).toEqual([{ name: card.name, url: 'https://cards.scryfall.io/normal/front/test.jpg' }]);
  for (const url of ['javascript:alert(1)', 'http://cards.scryfall.io/a', 'https://cards.scryfall.io.evil/a', 'https://user:pass@cards.scryfall.io/a']) expect(safeScryfallUrl(url, 'image')).toBeNull();
  expect(safeScryfallUrl('https://scryfall.com/card/test', 'link')).toBe('https://scryfall.com/card/test');
});
it('supports face images and empty/malformed optional imagery without blocking metadata', () => {
  expect(referenceFaces({ ...card, card_faces: [] })).toEqual([{ name: card.name, url: null }]);
  expect(referenceFaces({ ...card, card_faces: [{ name: 'Front', image_uris: { normal: 'https://cards.scryfall.io/front.jpg' } }, { name: 'Back' }] })).toEqual([{ name: 'Front', url: 'https://cards.scryfall.io/front.jpg' }, { name: 'Back', url: null }]);
  expect(referenceFaces({ ...card, image_uris: { normal: 'https://evil.example/a' } })[0]?.url).toBeNull();
});
it('accepts current Scryfall full-card grid/display formats without art crops', () => {
  expect(referenceFaces({ ...card, image_uris: { grid: 'https://cards.scryfall.io/grid/front/a.webp' } })[0]?.url).toBe('https://cards.scryfall.io/grid/front/a.webp');
});
it('uncooperative reversed provider responses retain the current image target, including reset (SYNTHETIC)', async () => {
  const { ResultSession } = await import('../../src/ui/session.js');
  const pending: ((value: typeof card) => void)[] = [];
  const session = new ResultSession(() => new Promise(resolve => pending.push(resolve)), async () => ({ jpyPerUsd: 150, asOf: '2026-10-02' }), () => {});
  const first = { ...card, id: 'synthetic-first', image_uris: { normal: 'https://cards.scryfall.io/first.jpg' } };
  const second = { ...card, id: 'synthetic-second', image_uris: { normal: 'https://cards.scryfall.io/second.jpg' } };
  const a = session.select(first, 'nonfoil'); const b = session.select(second, 'nonfoil');
  expect(referenceFaces(session.value.card!)[0]?.url).toBe(second.image_uris.normal);
  pending[1]!(second); await b; pending[0]!(first); await a;
  expect(referenceFaces(session.value.card!)[0]?.url).toBe(second.image_uris.normal);
  const old = session.select(first, 'nonfoil'); session.reset(); pending[2]!(first); await old;
  expect(session.value.card).toBeNull();
});
