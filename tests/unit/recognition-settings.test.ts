import {it,expect} from 'vitest';
import { defaults, bounds, validateSettings } from '../../src/recognition/settings.js';
import { StabilityGate } from '../../src/recognition/gate.js';
it('validates finite bounded integer values and threshold relationship',()=>{
 expect(validateSettings({...defaults,tentativeScore:.8})).toBe(false);
 expect(validateSettings({...defaults,autoConsecutive:1.5})).toBe(false);
 expect(validateSettings({...defaults,delayMs:NaN})).toBe(false);
 expect(validateSettings(defaults)).toBe(true);
});
it('configured automatic gate changes score, margin and repetition logic',()=>{
 const gate=new StabilityGate({score:.8,margin:.1,consecutive:3});
 const c={cardId:'synthetic',score:.79,margin:.2,cornersValid:true,cardPresent:true};
 expect(gate.observe(c)).toBeNull();
 expect(gate.observe({...c,score:.9,margin:.09})).toBeNull();
 expect(gate.observe({...c,score:.9})).toBeNull(); expect(gate.observe({...c,score:.9})).toBeNull(); expect(gate.observe({...c,score:.9})).toBe('synthetic');
});
it('every setting rejects nonfinite, empty-equivalent NaN, bounds and fractional integer inputs',()=>{
 for(const [key,[min,max,step]] of Object.entries(bounds)){
  expect(validateSettings({...defaults,[key]:NaN})).toBe(false);expect(validateSettings({...defaults,[key]:Infinity})).toBe(false);
  expect(validateSettings({...defaults,[key]:min-1})).toBe(false);expect(validateSettings({...defaults,[key]:max+1})).toBe(false);
  if(step===1)expect(validateSettings({...defaults,[key]:min+.5})).toBe(false);
 }
});
