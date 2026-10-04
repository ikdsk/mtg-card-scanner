import { describe, it, expect } from 'vitest';
import { LiveCandidate } from '../../src/recognition/live-candidate.js';
const c = {cardId:'synthetic-a',oracleId:'oracle-a',score:.623,margin:.01,cornersValid:true,cardPresent:true};
describe('synthetic tentative evidence',()=>{
 it('proposes on one observation without acceptance; dismissal suppresses stationary repeats',()=>{
  const live=new LiveCandidate(); const first=live.observe(c,0); expect(first?.cardId).toBe(c.cardId);
  live.dismiss(first!); expect(live.observe(c,200)).toBeNull();
  for(const time of [400,700,1000]) live.observe({...c,cardPresent:false},time);
  expect(live.observe(c,1200)?.cardId).toBe(c.cardId);
 });
});
it('replaced snapshot is invalid and configured score/rearm values change logic',()=>{
 const live=new LiveCandidate(.7,2,100);expect(live.observe(c,0)).toBeNull();
 const a=live.observe({...c,score:.8},10)!;const b=live.observe({...c,cardId:'b',oracleId:'b',score:.8},20)!;
 expect(live.current(a)).toBe(false);expect(live.current(b)).toBe(true);live.dismiss(b);
 live.observe({...c,cardPresent:false},30);live.observe({...c,cardPresent:false},130);
 expect(live.observe({...c,cardId:'b',oracleId:'b',score:.8},150)).not.toBeNull();
});
it('new Oracle context rearms a dismissed suggestion; reset keeps confirmed suppression',()=>{
 const live=new LiveCandidate();const a=live.observe(c,0)!;live.dismiss(a);
 live.observe({...c,cardId:'b',oracleId:'b'},100);expect(live.observe(c,200)).not.toBeNull();
 live.accepted('oracle-a');live.reset();expect(live.observe(c,300)).toBeNull();
});
it('explicit new scan context clears suppression and invalidates immutable interaction snapshots',()=>{
 const live=new LiveCandidate();const first=live.observe(c,0)!;live.accepted(first.identity);live.newContext();
 expect(live.current(first)).toBe(false);expect(live.observe(c,100)).not.toBeNull();
});
