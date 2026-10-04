import { expect, it } from 'vitest';
import { StabilityGate } from '../../src/recognition/gate.js';
it('requires two valid matching frames and resets on low quality (SYNTHETIC)', () => {
  const gate = new StabilityGate();
  const c = { cardId: 'id', score: 0.91, cornersValid: true, cardPresent: true, margin: 0.1 };
  expect(gate.observe(c)).toBeNull();
  expect(gate.observe({ ...c, score: 0.4 })).toBeNull();
  expect(gate.observe(c)).toBeNull();
  expect(gate.observe(c)).toBe('id');
  gate.reset();
  expect(gate.observe({ ...c, cornersValid: false })).toBeNull();
});
