import {it,expect} from 'vitest';
import { CandidateMetadata } from '../../src/ui/candidate-metadata.js';
it('coalesces and caches synthetic metadata, bounded cache; failures do not retry each frame',async()=>{
 let count=0; const cache=new CandidateMetadata(async(id:string)=>{count++;if(id==='bad')throw new Error('unavailable');return {id};});
 const [a,b]=await Promise.all([cache.get('a'),cache.get('a')]);expect(a).toBe(b);await cache.get('a');expect(count).toBe(1);
 await expect(cache.get('bad')).rejects.toThrow();await expect(cache.get('bad')).rejects.toThrow();expect(count).toBe(2);
});
