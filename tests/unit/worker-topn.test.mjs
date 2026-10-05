import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
// Executes the vendored worker search/frame code with SYNTHETIC float16 vectors; no ONNX inference.
const F16={1:0x3c00,.75:0x3a00,.5:0x3800,.375:0x3600,.25:0x3400,.125:0x3000,0:0};
// [oracle, first-component score, faceIndex]
const rows=[['A',.25,0],['B',1,0],['A',.75,1],['C',.5,0],['D',.125,0],['E',0,0],['F',.375,0],['B',.5,0]];
async function load(rowSpec=rows){
 let message;
 const records=rowSpec.map(([oracle,,faceIndex],i)=>({id:`card-${i}`,name:`Name ${oracle}${i}`,faceIndex,identifiers:{scryfall_oracle:`oracle-${oracle}`}}));
 const dims=2;const embeddings=new Uint16Array(records.length*dims);
 rowSpec.forEach(([,score],i)=>{embeddings[i*dims]=F16[score];});
 const catalog={rows:records.length,records,dimension:dims,embeddings,embedding:{model:'m@sha256:abc'},version:52};
 class Canvas {constructor(w,h){this.width=w;this.height=h;}getContext(){return {drawImage(){}};}}
 const context=vm.createContext({URL,performance,Uint16Array,Float32Array,Map,Math,console,AbortSignal,OffscreenCanvas:Canvas,self:{location:{href:'https://fixture.example/recognition/scanner.worker.mjs'},postMessage(m){message=m;}},BrowserCatalogV2:{forGame:async()=>catalog}});
 let source=await readFile(new URL('../../public/recognition/scanner.worker.mjs',import.meta.url),'utf8');
 source=source.replaceAll('import.meta.url',JSON.stringify('https://fixture.example/recognition/scanner.worker.mjs')).replace('const { BrowserCatalogV2 } = await import(moduleUrl.href);','');
 vm.runInContext(source+'\nglobalThis.testRuntime=Object.create(WorkerRuntime.prototype);globalThis.testFrame=processFrame;runtime=testRuntime;',context);
 const runtime=context.testRuntime;runtime.manifest={model_hashes:{milo:'sha256:abc'},catalog:{dims}};
 await runtime.loadCatalogV2();
 return {runtime,context,records,message:()=>message};
}
const query=()=>new Float32Array([1,0]);
it('search keeps the single best match unchanged and adds the next best distinct identities',async()=>{
 const {runtime,records}=await load();
 const result=runtime.search(query());
 expect(result.cardId).toBe(records[1].id);expect(result.score).toBe(1);expect(result.margin).toBe(.25);
 // One entry per identity, best row of that identity, best identity excluded, score order, max four.
 expect(result.alternatives.map(x=>x.cardId)).toEqual(['card-2','card-3','card-6','card-4']);
 expect(result.alternatives.map(x=>x.score)).toEqual([.75,.5,.375,.125]);
 expect(result.alternatives[0]).toMatchObject({faceIndex:1,cardName:'Name A2',secondaryId:'oracle-A',secondaryIdField:'scryfallOracleId'});
});
it('returns fewer alternatives when the catalog has few identities and none for a single identity',async()=>{
 const few=await load([['A',1,0],['A',.5,0],['B',.25,0]]);
 expect(few.runtime.search(query()).alternatives.map(x=>x.cardId)).toEqual(['card-2']);
 const one=await load([['A',1,0],['A',.5,0]]);
 expect(one.runtime.search(query()).alternatives).toEqual([]);
});
it('worker result message carries lightweight alternatives alongside the best match',async()=>{
 const {runtime,context,message}=await load();
 runtime.detect=async()=>({cardPresent:true,cornersValid:true,corners:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],timing:{}});runtime.dewarp=()=>({});
 const best=runtime.search(query());
 runtime.identify=async()=>({best,timing:{},searchMs:0});
 await context.testFrame({width:2,height:2,close(){}});
 expect(message().cardId).toBe('card-1');
 expect(message().alternatives.map(x=>x.cardId)).toEqual(['card-2','card-3','card-6','card-4']);
});
it('keeps the alternatives that belong to the better orientation',async()=>{
 const {runtime,context}=await load();
 const upright={...runtime.search(query()),score:.1,alternatives:[{cardId:'upright-alt'}]};
 const rotated={...runtime.search(query()),orientation:'rotated_180'};
 expect(context.chooseBetterMatch(upright,rotated).alternatives.map(x=>x.cardId)).toEqual(['card-2','card-3','card-6','card-4']);
 expect(context.chooseBetterMatch({...upright,score:2},rotated).alternatives[0].cardId).toBe('upright-alt');
});
