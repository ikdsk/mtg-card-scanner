import { it, expect } from 'vitest';
import { validCorners, contentRect } from '../../src/ui/detection-overlay.js';
// SYNTHETIC normalized worker geometry.
it('validates convex normalized quads without fabricating or clamping', () => {
 expect(validCorners([[.1,.1],[.9,.1],[.9,.9],[.1,.9]])).not.toBeNull();
 for(const corners of [null, [[0,0]], [[0,0],[1,0],[1,NaN],[0,1]], [[0,0],[2,0],[1,1],[0,1]], [[0,0],[1,1],[1,0],[0,1]], [[0,0],[.01,0],[.01,.01],[0,.01]]]) expect(validCorners(corners)).toBeNull();
});
it('maps landscape/portrait content inside letterbox independently of DPR', () => {
 expect(contentRect(390,422,1280,720)).toEqual({x:0,y:101.3125,width:390,height:219.375});
 expect(contentRect(960,450,720,1280)).toEqual({x:353.4375,y:0,width:253.125,height:450});
});
