import {it,expect} from 'vitest';
import { defaults, bounds, validateSettings } from '../../src/recognition/settings.js';
import { LiveCandidate } from '../../src/recognition/live-candidate.js';
it('validates finite bounded integer values and confirmation-only controls',()=>{
 expect(validateSettings({...defaults,tentativeScore:.8})).toBe(true);
 expect(Object.keys(defaults)).not.toContain("autoScore");
 expect(validateSettings({...defaults,rearmCount:1.5})).toBe(false);
 expect(validateSettings({...defaults,delayMs:NaN})).toBe(false);
 expect(validateSettings(defaults)).toBe(true);
});
it('configured tentative threshold remains one observation and margin is diagnostic only',()=>{
 const gate=new LiveCandidate(.8);
 const c={cardId:'synthetic',score:.79,margin:.2,cornersValid:true,cardPresent:true};
 expect(gate.observe(c,0)).toBeNull();
 expect(gate.observe({...c,score:.9,margin:0},100)?.cardId).toBe('synthetic');
 expect(gate.observe({...c,score:.9},200)?.cardId).toBe('synthetic');
});
it('every setting rejects nonfinite, empty-equivalent NaN, bounds and fractional integer inputs',()=>{
 for(const [key,[min,max,step]] of Object.entries(bounds)){
  expect(validateSettings({...defaults,[key]:NaN})).toBe(false);expect(validateSettings({...defaults,[key]:Infinity})).toBe(false);
  expect(validateSettings({...defaults,[key]:min-1})).toBe(false);expect(validateSettings({...defaults,[key]:max+1})).toBe(false);
  if(step===1)expect(validateSettings({...defaults,[key]:min+.5})).toBe(false);
 }
});
