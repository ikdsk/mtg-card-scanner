import { describe, expect, it } from 'vitest';
import { acceptsResponse, initialSelection, nextScan, overrideSelection, recognize, requestToken } from '../../src/domain/selection.js';

// Synthetic identities only. No camera, provider, or actual card fixtures.
const card = () => ({ oracleId: 'synthetic-oracle-a', printingId: 'synthetic-print-a', language: 'ja', finish: 'nonfoil' });

describe('independent selection contract regressions', () => {
  it('starts empty and rejects even an exactly matching empty-state token', () => {
    const state = initialSelection();
    expect(state).toEqual({ generation: 0, revision: 0, selected: null, manual: false });
    expect(requestToken(state)).toEqual({ generation: 0, revision: 0 });
    expect(acceptsResponse(state, requestToken(state))).toBe(false);
  });

  it('recognizes a selection and accepts its current token', () => {
    const selected = card();
    const state = recognize(initialSelection(), selected, 0);
    expect(state).toEqual({ generation: 0, revision: 1, selected, manual: false });
    expect(requestToken(state)).toEqual({ generation: 0, revision: 1 });
    expect(acceptsResponse(state, requestToken(state))).toBe(true);
  });

  it('treats equal selection values in different objects as idempotent', () => {
    const state = recognize(initialSelection(), card(), 0);
    const token = requestToken(state);
    const repeated = recognize(state, card(), 0);
    expect(repeated).toEqual(state);
    expect(acceptsResponse(repeated, token)).toBe(true);
  });

  it.each([
    { oracleId: 'synthetic-oracle-b' },
    { printingId: 'synthetic-print-b' },
    { language: 'en' },
    { finish: 'foil' },
  ])('increments revision when any identity field changes: %j', (change) => {
    const state = recognize(initialSelection(), card(), 0);
    const selected = { ...card(), ...change };
    const changed = recognize(state, selected, 0);
    expect(changed).toEqual({ generation: 0, revision: 2, selected, manual: false });
    expect(acceptsResponse(changed, requestToken(state))).toBe(false);
  });

  it.each([-1, 1])('ignores recognition from a wrong generation %s', (generation) => {
    const state = recognize(initialSelection(), card(), 0);
    expect(recognize(state, { ...card(), finish: 'foil' }, generation)).toEqual(state);
  });

  it('permits manual selection before recognition and ignores subsequent recognition', () => {
    const manual = overrideSelection(initialSelection(), card());
    expect(manual).toEqual({ generation: 0, revision: 1, selected: card(), manual: true });
    expect(recognize(manual, { ...card(), printingId: 'synthetic-late' }, 0)).toEqual(manual);
  });

  it('rejects a late price after manual printing/language/finish override', () => {
    const recognized = recognize(initialSelection(), card(), 0);
    const latePrice = requestToken(recognized);
    const chosen = { ...card(), printingId: 'synthetic-print-b', language: 'en', finish: 'foil' };
    const manual = overrideSelection(recognized, chosen);
    expect(manual).toEqual({ generation: 0, revision: 2, selected: chosen, manual: true });
    const afterLateRecognition = recognize(manual, card(), 0);
    expect(afterLateRecognition).toEqual(manual);
    expect(acceptsResponse(afterLateRecognition, latePrice)).toBe(false);
    expect(acceptsResponse(afterLateRecognition, requestToken(manual))).toBe(true);
  });

  it('invalidates outstanding prices for each manual override even with identical values', () => {
    const state = recognize(initialSelection(), card(), 0);
    const first = overrideSelection(state, card());
    const second = overrideSelection(first, card());
    expect(first).toEqual({ generation: 0, revision: 2, selected: card(), manual: true });
    expect(second).toEqual({ generation: 0, revision: 3, selected: card(), manual: true });
    expect(acceptsResponse(first, requestToken(state))).toBe(false);
    expect(acceptsResponse(second, requestToken(first))).toBe(false);
  });

  it('resets manual state and rejects prior-generation results even when revision repeats', () => {
    const previous = overrideSelection(initialSelection(), card());
    const oldPrice = requestToken(previous);
    const reset = nextScan(previous);
    expect(reset).toEqual({ generation: 1, revision: 0, selected: null, manual: false });
    expect(acceptsResponse(reset, oldPrice)).toBe(false);
    expect(recognize(reset, card(), 0)).toEqual(reset);
    const current = recognize(reset, card(), 1);
    expect(current).toEqual({ generation: 1, revision: 1, selected: card(), manual: false });
    expect(recognize(current, { ...card(), finish: 'foil' }, 0)).toEqual(current);
    expect(acceptsResponse(current, oldPrice)).toBe(false);
    expect(acceptsResponse(current, requestToken(current))).toBe(true);
    expect(nextScan(nextScan(current))).toEqual({ generation: 3, revision: 0, selected: null, manual: false });
  });

  it.each([
    { generation: 0, revision: 0 },
    { generation: 0, revision: 2 },
    { generation: 1, revision: 1 },
    { generation: -1, revision: 1 },
  ])('requires exact generation and revision for response token %j', (token) => {
    const state = recognize(initialSelection(), card(), 0);
    expect(acceptsResponse(state, token)).toBe(false);
  });

  it.each(['recognize', 'override'] as const)('%s clones accepted input selection', (action) => {
    const input = card();
    const state = action === 'recognize' ? recognize(initialSelection(), input, 0) : overrideSelection(initialSelection(), input);
    input.oracleId = 'mutated';
    input.printingId = 'mutated';
    input.language = 'mutated';
    input.finish = 'mutated';
    expect(state.selected).toEqual(card());
  });

  it('does not mutate caller-owned states during transitions or token checks', () => {
    const empty = Object.freeze(initialSelection());
    const recognized = recognize(empty, Object.freeze(card()), 0);
    const snapshot = { generation: 0, revision: 1, selected: card(), manual: false };
    Object.freeze(recognized.selected);
    Object.freeze(recognized);
    recognize(recognized, { ...card(), finish: 'foil' }, 0);
    overrideSelection(recognized, card());
    nextScan(recognized);
    acceptsResponse(recognized, Object.freeze(requestToken(recognized)));
    expect(recognized).toEqual(snapshot);
    expect(empty).toEqual({ generation: 0, revision: 0, selected: null, manual: false });
  });

  it('returns a token snapshot that cannot mutate its source state', () => {
    const state = recognize(initialSelection(), card(), 0);
    const token = requestToken(state);
    token.generation = 999;
    token.revision = 999;
    expect(state).toEqual({ generation: 0, revision: 1, selected: card(), manual: false });
  });
});
