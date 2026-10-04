import { expect, it } from 'vitest';
import { LiveCandidate } from '../../src/recognition/live-candidate.js';
it('proposes after one valid frame and clears low quality without implicit confirmation (SYNTHETIC)', () => {
  const gate = new LiveCandidate();
  const c = { cardId: 'id', score: 0.91, cornersValid: true, cardPresent: true, margin: 0.1 };
  expect(gate.observe(c,0)?.cardId).toBe('id');
  expect(gate.observe({ ...c, score: 0.4 },100)).toBeNull();
  expect(gate.observe(c,0)?.cardId).toBe('id');
  expect(gate.observe(c,0)?.cardId).toBe('id');
  gate.reset();
  expect(gate.observe({ ...c, cornersValid: false },200)).toBeNull();
});
