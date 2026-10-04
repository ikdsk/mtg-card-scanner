import { it, expect } from 'vitest';
import { LiveCandidate } from '../../src/recognition/live-candidate.js';
// SYNTHETIC detector results; no accuracy/performance evidence.
const a = { cardId: 'a', oracleId: 'oracle-a', score: .95, margin: .1, cardPresent: true, cornersValid: true };
it('proposes A then B with explicit confirmation without per-frame duplicates or printing jitter', () => {
 const scan = new LiveCandidate();
 expect(scan.observe(a, 0)?.cardId).toBe('a'); expect(scan.observe(a, 200)?.cardId).toBe('a');scan.accepted('oracle-a');
 expect(scan.observe(a, 400)).toBeNull();
 expect(scan.observe({...a, cardId:'print-a'}, 600)).toBeNull();
 expect(scan.observe({...a, cardId:'print-a'}, 800)).toBeNull();
 const b = {...a, cardId:'b', oracleId:'oracle-b'};
 expect(scan.observe(b, 1000)?.cardId).toBe('b'); expect(scan.observe(b, 1200)?.cardId).toBe('b');scan.accepted('oracle-b');
});
it('rearms only after three absent results spanning 600ms, never low score ambiguity', () => {
 const scan = new LiveCandidate(); scan.observe(a,0); scan.accepted('oracle-a');
 for(let t=400;t<1400;t+=200) expect(scan.observe({...a,score:.1},t)).toBeNull();
 expect(scan.observe(a,1400)).toBeNull(); expect(scan.observe(a,1600)).toBeNull();
 const lost = {...a,cardPresent:false,cornersValid:false};
 scan.observe(lost,1800); scan.observe(lost,2100); scan.observe(lost,2400);
 expect(scan.observe(a,2600)?.cardId).toBe('a'); expect(scan.observe(a,2800)?.cardId).toBe('a');
});
it('interrupted absence does not rearm; explicit restart resets acceptance (SYNTHETIC)', () => {
 const scan=new LiveCandidate();scan.observe(a,0);scan.accepted('oracle-a');
 const absent={...a,cardPresent:false,cornersValid:false};
 scan.observe(absent,400);scan.observe(absent,700);scan.observe({...a,score:.1},800);scan.observe(absent,1100);
 expect(scan.observe(a,1400)).toBeNull();expect(scan.observe(a,1600)).toBeNull();
 scan.newContext();expect(scan.observe(a,1800)?.cardId).toBe('a');expect(scan.observe(a,2000)?.cardId).toBe('a');
});
