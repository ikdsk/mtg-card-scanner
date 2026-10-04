import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
// Execute vendored catalog/search/frame code with SYNTHETIC vectors/canvas; no ONNX inference.
it('preserves validated catalog face through search and worker result; legacy defaults front',async()=>{
 let message;
 const records=[0,1,undefined,-1,2,1.5,'1'].map((faceIndex,i)=>({id:`synthetic-${i}`,name:'Fixture',faceIndex,identifiers:{scryfall_oracle:`oracle-${i}`}}));
 const catalog={rows:records.length,records,dimension:records.length,embeddings:new Uint16Array(records.length**2),embedding:{model:'m@sha256:abc'},version:52};
 for(let i=0;i<records.length;i++)catalog.embeddings[i*records.length+i]=0x3c00;
 class Canvas {constructor(w,h){this.width=w;this.height=h;}getContext(){return {drawImage(){}};}}
 const context=vm.createContext({URL,performance,Uint16Array,Float32Array,Map,Math,console,AbortSignal,OffscreenCanvas:Canvas,self:{location:{href:'https://fixture.example/recognition/scanner.worker.mjs'},postMessage(m){message=m;}},BrowserCatalogV2:{forGame:async()=>catalog}});
 let source=await readFile(new URL('../../public/recognition/scanner.worker.mjs',import.meta.url),'utf8');
 source=source.replaceAll('import.meta.url',JSON.stringify('https://fixture.example/recognition/scanner.worker.mjs')).replace('const { BrowserCatalogV2 } = await import(moduleUrl.href);','');
 vm.runInContext(source+'\nglobalThis.testRuntime=Object.create(WorkerRuntime.prototype);globalThis.testFrame=processFrame;runtime=testRuntime;',context);
 const runtime=context.testRuntime;runtime.manifest={model_hashes:{milo:'sha256:abc'},catalog:{dims:records.length}};
 await runtime.loadCatalogV2();
 runtime.detect=async()=>({cardPresent:true,cornersValid:true,corners:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],timing:{}});runtime.dewarp=()=>({});
 for(let i=0;i<records.length;i++){
  const query=new Float32Array(records.length);query[i]=1;const best=runtime.search(query);
  expect(best.faceIndex).toBe(i===1?1:0);
  runtime.identify=async()=>({best,timing:{},searchMs:0});
  await context.testFrame({width:2,height:2,close(){}});
  expect(message.faceIndex).toBe(i===1?1:0);expect(message.cardId).toBe(records[i].id);
 }
});
