import { it, expect } from 'vitest';
import { ContinuousScan } from '../../src/recognition/continuous.js';
// SYNTHETIC detector results; no accuracy/performance evidence.
const a = { cardId: 'a', oracleId: 'oracle-a', score: .95, margin: .1, cardPresent: true, cornersValid: true };
it('accepts A then B without per-frame duplicates or printing jitter', () => {
 const scan = new ContinuousScan();
 expect(scan.observe(a, 0)).toBeNull(); expect(scan.observe(a, 200)).toBe('a');
 expect(scan.observe(a, 400)).toBeNull();
 expect(scan.observe({...a, cardId:'print-a'}, 600)).toBeNull();
 expect(scan.observe({...a, cardId:'print-a'}, 800)).toBeNull();
 const b = {...a, cardId:'b', oracleId:'oracle-b'};
 expect(scan.observe(b, 1000)).toBeNull(); expect(scan.observe(b, 1200)).toBe('b');
});
it('rearms only after three absent results spanning 600ms, never low score ambiguity', () => {
 const scan = new ContinuousScan(); scan.observe(a,0); scan.observe(a,200);
 for(let t=400;t<1400;t+=200) expect(scan.observe({...a,score:.1},t)).toBeNull();
 expect(scan.observe(a,1400)).toBeNull(); expect(scan.observe(a,1600)).toBeNull();
 const lost = {...a,cardPresent:false,cornersValid:false};
 scan.observe(lost,1800); scan.observe(lost,2100); scan.observe(lost,2400);
 expect(scan.observe(a,2600)).toBeNull(); expect(scan.observe(a,2800)).toBe('a');
});
it('interrupted absence does not rearm; explicit restart resets acceptance (SYNTHETIC)', () => {
 const scan=new ContinuousScan();scan.observe(a,0);scan.observe(a,200);
 const absent={...a,cardPresent:false,cornersValid:false};
 scan.observe(absent,400);scan.observe(absent,700);scan.observe({...a,score:.1},800);scan.observe(absent,1100);
 expect(scan.observe(a,1400)).toBeNull();expect(scan.observe(a,1600)).toBeNull();
 scan.reset();expect(scan.observe(a,1800)).toBeNull();expect(scan.observe(a,2000)).toBe('a');
});
