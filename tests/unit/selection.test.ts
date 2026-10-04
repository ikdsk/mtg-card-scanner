import { describe, expect, it } from 'vitest';
import * as domain from '../../src/domain/selection.js';

// All IDs and selections below are synthetic fixtures, not recognition/provider evidence.
const card = { oracleId: 'synthetic-oracle', printingId: 'synthetic-printing', language: 'ja', finish: 'nonfoil' };

describe('selection domain', () => {
  // Additional contract regression checks for behavior already implemented by earlier cycles.
  it.each(['oracleId', 'printingId', 'language', 'finish'] as const)(
    'recognition increments revision when only %s changes', (field) => {
      const before = Object.freeze({ generation: 6, revision: 10, selected: Object.freeze({ ...card }), manual: false });
      const changed = { ...card, [field]: 'synthetic-different' };
      const after = domain.recognize(before, changed, 6);
      expect(after).toEqual({ generation: 6, revision: 11, selected: changed, manual: false });
      expect(after.selected).not.toBe(changed);
      expect(domain.acceptsResponse(after, domain.requestToken(before))).toBe(false);
      expect(before.selected).toEqual(card);
    },
  );
  it('retains a response token across repeated identical recognition', () => {
    const state = domain.recognize(domain.initialSelection(), card, 0);
    const token = domain.requestToken(state);
    expect(domain.acceptsResponse(domain.recognize(state, { ...card }, 0), token)).toBe(true);
  });
  it('starts the next scan with an incremented generation and cleared selection', () => {
    const before = Object.freeze({ generation: 7, revision: 12, selected: Object.freeze({ ...card }), manual: true });
    const next = domain.nextScan(before);
    expect(next).toEqual({ generation: 8, revision: 0, selected: null, manual: false });
    expect(next).not.toBe(before);
    expect(domain.nextScan(next)).toEqual({ generation: 9, revision: 0, selected: null, manual: false });
    expect(domain.recognize(next, card, 7)).toBe(next);
    expect(domain.acceptsResponse(next, domain.requestToken(before))).toBe(false);
    const recognized = domain.recognize(next, card, 8);
    expect(recognized.revision).toBe(1);
    expect(domain.acceptsResponse(recognized, { generation: 7, revision: 1 })).toBe(false);
    expect(domain.acceptsResponse(recognized, domain.requestToken(recognized))).toBe(true);
  });
  it('rejects a different response generation even with an equal revision', () => {
    const state = Object.freeze({ generation: 5, revision: 1, selected: Object.freeze({ ...card }), manual: false });
    expect(domain.acceptsResponse(state, { generation: 4, revision: 1 })).toBe(false);
    expect(domain.acceptsResponse(state, { generation: 6, revision: 1 })).toBe(false);
    expect(domain.acceptsResponse(state, domain.requestToken(state))).toBe(true);
  });
  it('rejects a different response revision after identical manual reselection', () => {
    const before = domain.recognize(domain.initialSelection(), card, 0);
    const oldToken = domain.requestToken(before);
    const manual = domain.overrideSelection(before, { ...card });
    const repeated = domain.overrideSelection(Object.freeze(manual), { ...card });
    expect(repeated.revision).toBe(before.revision + 2);
    expect(repeated.manual).toBe(true);
    expect(domain.acceptsResponse(manual, oldToken)).toBe(false);
    expect(domain.acceptsResponse(repeated, domain.requestToken(manual))).toBe(false);
    expect(domain.acceptsResponse(repeated, { generation: repeated.generation, revision: repeated.revision + 1 })).toBe(false);
    expect(domain.acceptsResponse(repeated, domain.requestToken(repeated))).toBe(true);
  });
  it('rejects responses when no selection exists even with a matching token', () => {
    const state = domain.initialSelection();
    expect(domain.acceptsResponse(state, domain.requestToken(state))).toBe(false);
  });
  it('accepts a matching token for a selected state', () => {
    const state = Object.freeze({ generation: 4, revision: 9, selected: Object.freeze({ ...card }), manual: true });
    expect(domain.acceptsResponse(state, Object.freeze(domain.requestToken(state)))).toBe(true);
  });
  it('snapshots generation and revision in a detached request token', () => {
    const state = { generation: 4, revision: 9, selected: { ...card }, manual: true };
    const token = domain.requestToken(state);
    expect(token).toEqual({ generation: 4, revision: 9 });
    state.revision = 10;
    expect(token.revision).toBe(9);
    token.generation = 7;
    expect(state.generation).toBe(4);
  });
  it('clones accepted manual selection input', () => {
    const input = { ...card };
    const state = domain.overrideSelection(domain.initialSelection(), input);
    input.finish = 'synthetic-mutated';
    expect(state.selected).toEqual(card);
    expect(state.selected).not.toBe(input);
  });
  it('manually overrides selection with a new revision', () => {
    const before = Object.freeze({ generation: 5, revision: 12, selected: Object.freeze({ ...card }), manual: false });
    const selection = { ...card, printingId: 'synthetic-other', language: 'en', finish: 'foil' };
    expect(domain.overrideSelection(before, selection)).toEqual({ generation: 5, revision: 13, selected: selection, manual: true });
    expect(before.manual).toBe(false);
  });
  it('clones accepted recognition input', () => {
    const input = { ...card };
    const state = domain.recognize(domain.initialSelection(), input, 0);
    input.printingId = 'synthetic-mutated';
    expect(state.selected).toEqual(card);
    expect(state.selected).not.toBe(input);
  });
  it('treats equal selection values as idempotent recognition', () => {
    const state = Object.freeze({ generation: 3, revision: 8, selected: Object.freeze({ ...card }), manual: false });
    expect(domain.recognize(state, { ...card }, 3)).toBe(state);
  });
  it('keeps manual selection fixed against current recognition', () => {
    const selected = Object.freeze({ ...card, finish: 'foil' });
    const state = Object.freeze({ generation: 2, revision: 9, selected, manual: true });
    expect(domain.recognize(state, card, 2)).toBe(state);
  });
  it('ignores recognition from any different generation', () => {
    const state = Object.freeze({ ...domain.initialSelection(), generation: 4, revision: 7 });
    expect(domain.recognize(state, card, 3)).toBe(state);
    expect(domain.recognize(state, card, 5)).toBe(state);
  });
  it('recognizes a current generation without mutating prior state', () => {
    const before = Object.freeze(domain.initialSelection());
    expect(domain.recognize(before, card, 0)).toEqual({ generation: 0, revision: 1, selected: card, manual: false });
    expect(before.selected).toBeNull();
  });
  it('starts with an empty generation zero state', () => {
    expect(domain.initialSelection()).toEqual({ generation: 0, revision: 0, selected: null, manual: false });
    expect(domain.initialSelection()).not.toBe(domain.initialSelection());
  });
});
