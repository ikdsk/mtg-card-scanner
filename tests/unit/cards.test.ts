import { expect, it } from 'vitest';
import { finishPrice } from '../../src/data/cards.js';
import { card } from './fixtures.js';
it('keeps real zero for the exact nonfoil finish and never substitutes a missing foil price', () => {
  expect(finishPrice(card, 'nonfoil')).toBe('0.00');
  expect(finishPrice(card, 'foil')).toBeNull();
  expect(finishPrice(card, 'etched')).toBeNull();
});
