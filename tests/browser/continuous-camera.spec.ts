import { openRoute, closeRoute } from './immersive-routes.js';
import { test, expect, type Page } from '@playwright/test';
// SYNTHETIC canvas camera, worker results and provider metadata. Not model accuracy evidence.
const a={id:'continuous-a',oracle_id:'oracle-a',name:'Synthetic Alpha',lang:'en',set:'tst',set_name:'Synthetic',collector_number:'1',finishes:['nonfoil','foil'],prices:{usd:'1',usd_foil:'2'},legalities:{}};
const b={...a,id:'continuous-b',oracle_id:'oracle-b',name:'Synthetic Beta'};
async function installSyntheticFlow(page: Page) {
 await page.addInitScript(()=>{
  const state={id:'continuous-a',oracle:'oracle-a',present:true,hold:false,frames:0};Object.assign(window,{continuousProbe:state});
  navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d')!.fillRect(0,0,1280,720);return c.captureStream(5);};
  class SyntheticWorker {
   onmessage:((e:{data:unknown})=>void)|null=null;
   postMessage(data:{type:string;bitmap?:ImageBitmap}){data.bitmap?.close();if(data.type==='frame')state.frames++;if(state.hold&&data.type==='frame')return;
    setTimeout(()=>this.onmessage?.({data:data.type==='init'?{type:'ready',catalogVersion:52}:{type:'result',cardId:state.id,scryfallOracleId:state.oracle,cardPresent:state.present,cornersValid:state.present,corners:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],score:.95,margin:.1}}),10);}
   terminate(){}
  }Object.defineProperty(window,'Worker',{value:SyntheticWorker});
 });
 await page.route('https://api.scryfall.com/**',route=>{const url=new URL(route.request().url());return route.fulfill({json:url.pathname.endsWith('/search')?{data:url.searchParams.get('q')?.includes('oracle-b')?[b]:[a],has_more:false}:url.pathname.endsWith('/continuous-b')?b:a});});
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({status:503,json:{}}));
}
test('continuous camera accepts A→B, suppresses stationary jitter, rearms removal and clears overlay',async({page},info)=>{
 await installSyntheticFlow(page);
 await page.goto('/');await page.screenshot({path:info.outputPath('initial.png')});
 await closeRoute(page); await page.getByRole('button',{name:'スキャン開始',exact:true}).click();
 await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','true');
 await page.screenshot({path:info.outputPath('scanning.png')});
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(0);await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();
 await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.screenshot({path:info.outputPath('accepted.png')});
 await page.evaluate(()=>{const s=(window as any).continuousProbe;s.id='printing-jitter';});
 await page.waitForTimeout(800);await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await page.evaluate(()=>{const s=(window as any).continuousProbe;s.id='continuous-b';s.oracle='oracle-b';});
 await expect(page.locator('.tentative')).toContainText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(1);await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();
 await expect(page.locator('.scan-history-row')).toHaveCount(2);await expect(page.locator('.scan-history-row').first()).toContainText('Synthetic Beta');
 await page.evaluate(()=>{(window as any).continuousProbe.present=false;});
 await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','false');await page.waitForTimeout(1000);
 await page.evaluate(()=>{(window as any).continuousProbe.present=true;});await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','true');await expect(page.locator('.tentative')).toContainText('Synthetic Beta');await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();await expect(page.locator('.scan-history-row')).toHaveCount(3);
 await page.evaluate(()=>{(window as any).continuousProbe.hold=true;});await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','false',{timeout:4000});
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();await expect(page.locator('video')).toHaveJSProperty('srcObject',null);
 await page.evaluate(()=>{(window as any).continuousProbe.hold=false; window.dispatchEvent(new Event('pagehide'));});
 await closeRoute(page); await page.getByRole('button',{name:'スキャン開始',exact:true}).click();
 await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','true');
 await page.evaluate(()=>{const tracks=(document.querySelector('video')!.srcObject as MediaStream).getTracks();Object.assign(window,{pagehideTracks:tracks});window.dispatchEvent(new Event('pagehide'));});
 expect(await page.evaluate(()=>(window as any).pagehideTracks.every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
 await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','false');
});

test('new tentative candidate rejects delayed old metadata; only confirmation records event (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
 await page.route('https://api.scryfall.com/cards/continuous-a',async route=>{await pending;await route.fulfill({json:a}).catch(()=>{});});
 await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'スキャン開始',exact:true}).click();
 await expect(page.locator('.empty-candidate')).toContainText('カード情報を確認中');await expect(page.locator('.tentative')).toBeHidden();await expect(page.locator('body')).not.toContainText('continuous-a');await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.evaluate(()=>{const s=(window as any).continuousProbe;s.id='continuous-b';s.oracle='oracle-b';});
 await expect(page.locator('.tentative')).toContainText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(0);await closeRoute(page); await page.getByRole('button',{name:'履歴に保存',exact:true}).click();await expect(page.locator('.scan-history-row').first()).toContainText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(1);
 release();await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await expect(page.locator('.scan-history-row').first()).toContainText('Synthetic Beta');await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
});
