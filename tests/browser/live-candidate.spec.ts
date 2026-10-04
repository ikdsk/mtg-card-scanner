import { openRoute, closeRoute } from './immersive-routes.js';
import { test, expect, type Page } from '@playwright/test';
// SYNTHETIC canvas camera, worker results and provider metadata. Not model accuracy evidence.
const a={id:'continuous-a',oracle_id:'oracle-a',name:'Synthetic Alpha',lang:'en',set:'tst',set_name:'Synthetic',collector_number:'1',finishes:['nonfoil','foil'],prices:{usd:'1',usd_foil:'2'},legalities:{},image_uris:{small:'https://cards.scryfall.io/small/synthetic.jpg',normal:'https://cards.scryfall.io/small/synthetic.jpg'}};
const b={...a,id:'continuous-b',oracle_id:'oracle-b',name:'Synthetic Beta'};
async function installSyntheticFlow(page: Page) {
 await page.addInitScript(()=>{
  const state={id:'continuous-a',oracle:'oracle-a',present:true,cornersValid:true,hold:false,frames:0,score:.623,margin:.01,latency:10,timings:[] as {frame:number;dispatchedAt:number;completedAt:number|undefined;present:boolean}[],completionWaiters:[] as (()=>void)[]};Object.assign(window,{continuousProbe:state});
  navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d')!.fillRect(0,0,1280,720);return c.captureStream(5);};
  class SyntheticWorker {
   onmessage:((e:{data:unknown})=>void)|null=null;
   postMessage(data:{type:string;bitmap?:ImageBitmap}){data.bitmap?.close();if(data.type==='frame')state.frames++;if(state.hold&&data.type==='frame')return;
    const snapshot={...state};
    const timing=data.type==='frame'?{frame:state.frames,dispatchedAt:performance.now(),completedAt:undefined as number|undefined,present:snapshot.present}:null;
    if(timing)state.timings.push(timing);
    setTimeout(()=>{
     if(timing)timing.completedAt=performance.now();
     this.onmessage?.({data:data.type==='init'?{type:'ready',catalogVersion:52}:{type:'result',cardId:snapshot.id,scryfallOracleId:snapshot.oracle,cardPresent:snapshot.present,cornersValid:snapshot.present&&snapshot.cornersValid,corners:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],score:snapshot.score,margin:snapshot.margin}});
     // Resolve after the real loop's result continuation updates state and schedules its delay.
     if(timing)queueMicrotask(()=>state.completionWaiters.splice(0).forEach(resolve=>resolve()));
    },data.type==='init'?10:snapshot.latency);}
   terminate(){}
  }Object.defineProperty(window,'Worker',{value:SyntheticWorker});
 });
 await page.route('https://api.scryfall.com/**',route=>{const url=new URL(route.request().url());return route.fulfill({json:url.pathname.endsWith('/search')?{data:url.searchParams.get('q')?.includes('oracle-b')?[b]:[a],has_more:false}:url.pathname.endsWith('/continuous-b')?b:a});});
 await page.route('https://cards.scryfall.io/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="68"><rect width="48" height="68" fill="#526685"/><text x="2" y="30" font-size="8" fill="white">TEST</text></svg>'}));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({status:503,json:{}}));
}
test('one observation proposal, dismiss, rearm, keyboard confirm, camera stays live (SYNTHETIC)',async({page},info)=>{
 await installSyntheticFlow(page);await page.goto('/');await page.screenshot({path:info.outputPath('initial.png')});
 await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();await page.screenshot({path:info.outputPath('debugopen.png'),fullPage:true});await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();await page.evaluate(()=>scrollTo(0,0));
 await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await expect(page.locator('.tentative')).toContainText('類似度 0.623');
 await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.screenshot({path:info.outputPath('tentative.png')});
 await page.getByRole('button',{name:'違う',exact:true}).click();await page.waitForTimeout(800);await expect(page.locator('.tentative')).toBeHidden();
 await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await page.waitForTimeout(1000);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'これです',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.locator('.result h2')).toHaveText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(1);await expect(page.locator('.tentative')).toBeHidden();await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
 await page.screenshot({path:info.outputPath('confirmed.png')});await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('pointer identity and dismissed delayed metadata cannot select another card (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.dispatchEvent('pointerdown');
 await page.evaluate(()=>{const s=(window as any).continuousProbe;s.id='continuous-b';s.oracle='oracle-b';});await expect(page.locator('.tentative')).toContainText('Synthetic Beta');
 await confirm.dispatchEvent('click');await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.getByRole('button',{name:'違う',exact:true}).click();await page.waitForTimeout(600);await expect(page.locator('.tentative')).toBeHidden();
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('pending metadata is no result and stopped late metadata cannot resurrect (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);
 await page.route('https://api.scryfall.com/cards/continuous-a',async route=>{await pending;await route.fulfill({json:a}).catch(()=>{});});
 await page.goto('/');await closeRoute(page);await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect(page.locator('.empty-candidate')).toContainText('カード情報を確認中');
 await expect(page.locator('.tentative')).toBeHidden();await expect(page.getByRole('button',{name:'これです',exact:true})).toBeHidden();
 await expect(page.locator('body')).not.toContainText('continuous-a');await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.getByRole('button',{name:'停止',exact:true}).click();release();await page.waitForTimeout(600);
 await expect(page.locator('.tentative')).toBeHidden();await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('settings invalid/reset and tentative threshold apply with preserved history/manual selection (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 const threshold=page.getByLabel('提案の類似度',{exact:true});await openRoute(page,'設定');await threshold.fill('.7');await threshold.dispatchEvent('change');
 await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await page.waitForTimeout(700);await expect(page.locator('.tentative')).toBeHidden();
 await openRoute(page,'設定');await threshold.fill('1.1');await threshold.dispatchEvent('change');await expect(threshold).toHaveValue('0.7');
 await page.getByRole('button',{name:'認識設定を初期値に戻す'}).click();await expect(threshold).toHaveValue('0.5');await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await closeRoute(page); await page.getByRole('button',{name:'これです',exact:true}).click();await openRoute(page,'確定カード'); await page.getByLabel('加工',{exact:true}).selectOption('foil');
 await openRoute(page,'設定');await page.getByLabel('推論完了後の待ち時間 (ms)',{exact:true}).fill('250');await page.getByLabel('推論完了後の待ち時間 (ms)',{exact:true}).dispatchEvent('change');
 await expect(page.getByLabel('加工',{exact:true})).toHaveValue('foil');await expect(page.locator('.scan-history-row')).toHaveCount(1);await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('all obsolete automatic controls are removed (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 for(const name of ['自動受付の類似度','異なるOracleとの最小 margin','自動受付の同じ印刷版の連続観測数'])await expect(page.getByLabel(name,{exact:true})).toHaveCount(0);
 await expect(page.locator('.recognition-settings input')).toHaveCount(5);
});
test('delay and both absence controls change capture/rearm; overlay expiry changes painting (SYNTHETIC)',async({page},info)=>{
 await installSyntheticFlow(page);await page.goto('/');await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 const set=async(name:string,value:string)=>{await openRoute(page,'設定');const input=page.getByLabel(name,{exact:true});await input.fill(value);await input.dispatchEvent('change');};
 await set('推論完了後の待ち時間 (ms)','700');await set('同じカードの再受付に必要な不在観測数','2');await set('不在の最小継続時間 (ms)','0');await set('四隅の表示期限 (ms)','100');
 await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'違う',exact:true}).click();
 // All transitions run inside the page from actual completion events; runner polling
 // cannot shift the 400ms checkpoint across a frame boundary.
 const evidence=await page.evaluate(async()=>{
  const state=(window as any).continuousProbe;
  const completed=()=>new Promise<void>(resolve=>state.completionWaiters.push(resolve));
  await completed();
  const baseline=state.frames;
  const completion=state.timings.at(-1).completedAt;
  await new Promise(resolve=>setTimeout(resolve,400));
  const checkpoint={elapsed:performance.now()-completion,frames:state.frames,detected:document.querySelector('.detection-overlay')!.getAttribute('data-detected')};
  state.present=false;await completed();
  state.present=true;await completed();
  const afterOneAbsence=document.querySelector<HTMLElement>('.tentative')!.hidden;
  state.present=false;await completed();await completed();
  state.present=true;await completed();
  return {baseline,checkpoint,afterOneAbsence,timings:state.timings};
 });
 await info.attach('frame-timings',{body:JSON.stringify(evidence,null,2),contentType:'application/json'});
 console.log(`${info.project.name} frame-timings ${JSON.stringify(evidence)}`);
 expect(evidence.checkpoint.elapsed).toBeGreaterThanOrEqual(400);
 expect(evidence.checkpoint.frames).toBe(evidence.baseline);
 expect(evidence.checkpoint.detected).toBe('false');
 expect(evidence.afterOneAbsence).toBe(true);
 for(let i=1;i<evidence.timings.length;i++){
  // The configured delay starts after inference, not after dispatch or metadata.
  expect(evidence.timings[i].dispatchedAt-evidence.timings[i-1].completedAt).toBeGreaterThanOrEqual(700);
 }
 expect(evidence.timings.slice(-5).map((frame:any)=>frame.present)).toEqual([false,true,false,false,true]);
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('320px proposal stays in immersive viewport and network is coalesced (SYNTHETIC)',async({page},info)=>{
 await page.setViewportSize({width:320,height:740});await installSyntheticFlow(page);let requests=0;let providerRequests=0;page.on('request',r=>{if(r.url().endsWith('/cards/continuous-a'))requests++;if(r.url().includes('api.scryfall.com')||r.url().includes('api.frankfurter.dev'))providerRequests++;});
 await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBeGreaterThanOrEqual(6);expect(requests).toBe(1);expect(providerRequests).toBe(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await page.screenshot({path:info.outputPath('tentative-320.png')});await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('settings discard in-flight old evidence without restarting camera (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();await page.evaluate(()=>{(window as any).continuousProbe.latency=1000;});
 await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBe(1);
 await page.evaluate(()=>{Object.assign(window,{oldStream:document.querySelector('video')!.srcObject});Object.assign((window as any).continuousProbe,{score:.4});});
 await openRoute(page,'設定');const input=page.getByLabel('推論完了後の待ち時間 (ms)',{exact:true});await input.fill('200');await input.dispatchEvent('change');await page.waitForTimeout(1100);await expect(page.locator('.tentative')).toBeHidden();await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBeGreaterThanOrEqual(2);
 expect(await page.evaluate(()=>document.querySelector('video')!.srcObject===(window as any).oldStream)).toBe(true);await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('file proposal confirms exactly one observation with no automatic repeat (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.evaluate(()=>{Object.assign((window as any).continuousProbe,{score:.95,margin:.1,latency:600});});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=2;return c.toDataURL().split(',')[1]!;});
 await page.locator('#local-image').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(0);await closeRoute(page); await page.getByRole('button',{name:'これです',exact:true}).click();await openRoute(page,'確定カード'); await page.getByLabel('加工',{exact:true}).selectOption('foil');
 expect(await page.evaluate(()=>(window as any).continuousProbe.frames)).toBe(1);await page.waitForTimeout(800);await expect(page.getByLabel('加工',{exact:true})).toHaveValue('foil');await expect(page.locator('.scan-history-row')).toHaveCount(1);
});
test('absence elapsed control alone delays rearm and reset restores every real value (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await openRoute(page,'設定'); await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 const set=async(name:string,value:string)=>{await openRoute(page,'設定');const input=page.getByLabel(name,{exact:true});await input.fill(value);await input.dispatchEvent('change');};
 await set('同じカードの再受付に必要な不在観測数','2');await set('不在の最小継続時間 (ms)','2000');
 await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'違う',exact:true}).click();
 await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await page.waitForTimeout(650);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});await page.waitForTimeout(300);await expect(page.locator('.tentative')).toBeHidden();
 await set('不在の最小継続時間 (ms)','0');await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await page.waitForTimeout(650);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await page.getByRole('button',{name:'認識設定を初期値に戻す'}).click();
 for(const [name,value] of [['提案の類似度','0.5'],['推論完了後の待ち時間 (ms)','180'],['同じカードの再受付に必要な不在観測数','3'],['不在の最小継続時間 (ms)','600'],['四隅の表示期限 (ms)','1500']])await expect(page.getByLabel(name!,{exact:true})).toHaveValue(value!);
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('mobile proposal confirmation is visible without scrolling and panel text has contrast (SYNTHETIC)',async({page})=>{
 await page.setViewportSize({width:390,height:844});await installSyntheticFlow(page);await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await expect(page.getByRole('button',{name:'これです',exact:true})).toBeInViewport();expect(await page.evaluate(()=>scrollY)).toBe(0);
 const contrast=await page.locator('.tentative').evaluate(node=>{
  const rgb=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
  const lum=(values:number[])=>values.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0);
  const style=getComputedStyle(node);const fg=lum(rgb(style.color));let parent:Element|null=node;let bg='';while(parent){bg=getComputedStyle(parent).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)')break;parent=parent.parentElement;}const background=lum(rgb(bg));return (Math.max(fg,background)+.05)/(Math.min(fg,background)+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});

for (const key of ['Space', 'Enter'] as const) test(`held ${key} autorepeat cannot confirm replacement B (SYNTHETIC native keyboard)`, async ({page}, info) => {
 await installSyntheticFlow(page);await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 // Enter confirms verified A on keydown; a held gesture must never confirm B.
 await page.evaluate(()=>{Object.assign(window,{activationEvents:[]});document.addEventListener('keydown',event=>{(window as any).activationEvents.push({key:event.key,repeat:event.repeat});});});
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.focus();await page.keyboard.down(key);
 await page.evaluate(()=>{Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b'});});await expect(page.locator('.tentative')).toContainText('Synthetic Beta');
 await page.keyboard.down(key);await page.keyboard.up(key);
 await info.attach('native-key-events',{body:JSON.stringify(await page.evaluate(()=>(window as any).activationEvents)),contentType:'application/json'});
 expect(await page.evaluate(()=>(window as any).activationEvents.map((event:any)=>event.repeat))).toEqual([false,true]);
 await expect(page.locator('.tentative')).toContainText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(key==='Enter'?1:0);
 if(key==='Enter')await expect(page.locator('.result h2')).toHaveText('Synthetic Alpha');else await expect(page.locator('.result')).toBeHidden();
 // A new gesture after release can confirm the current verified candidate.
 await confirm.focus();await page.keyboard.press(key);await expect(page.locator('.result h2')).toHaveText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(key==='Enter'?2:1);
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});

for(const cancel of ['blur','window blur','pointercancel'] as const) test(`canceled Space gesture via ${cancel} cannot activate replacement (SYNTHETIC)`,async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.focus();await page.keyboard.down('Space');
 if(cancel==='blur'){await page.getByRole('button',{name:'違う',exact:true}).focus();await confirm.focus();}
 else if(cancel==='window blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 else await confirm.dispatchEvent('pointercancel');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b'}));await expect(page.locator('.tentative')).toContainText('Synthetic Beta');
 await page.keyboard.down('Space');await page.keyboard.up('Space');await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();
 await confirm.focus();await page.keyboard.press('Space');await expect(page.locator('.result h2')).toHaveText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(1);await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});

test('high score repeated observations never confirm; obsolete auto controls absent (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.evaluate(()=>Object.assign((window as any).continuousProbe,{score:.99,margin:.9}));
 await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBeGreaterThanOrEqual(5);
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();
 await expect(page.getByLabel('自動受付の類似度',{exact:true})).toHaveCount(0);
 await closeRoute(page); await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.scan-history-row')).toHaveCount(1);await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});

test('rich current candidate separates verified Japanese display from physical price/image/expansion (SYNTHETIC)',async({page},info)=>{
 await installSyntheticFlow(page);
 const ja={...a,id:'jp-a',lang:'ja',set:'jpn',set_name:'Japanese display only',printed_name:'合成アルファ',prices:{usd:'999'}};
 await page.route('https://api.scryfall.com/cards/search?**',r=>r.fulfill({json:{data:[a,ja],has_more:false}}));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{base:'USD',quote:'JPY',rate:150,date:'2026-10-02'}}));
 await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 const panel=page.locator('.tentative');await expect(panel).toContainText('日本語：合成アルファ');await expect(panel).toContainText('英語：Synthetic Alpha');await expect(panel).toContainText('概算 ￥150');await expect(panel).toContainText('$1.00 USD');await expect(panel).toContainText('Synthetic (TST) #1 · en · nonfoil');
 await expect(panel.locator('.format-icon')).toHaveCount(7);await expect(panel.locator('img')).toHaveAttribute('src',a.image_uris.normal);await expect(panel).toContainText('Frankfurter / ECB');await expect(panel).toContainText('Scryfall');await expect(page.locator('.result')).toBeHidden();await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.evaluate(()=>{const label=document.createElement('div');label.textContent='SYNTHETIC · camera / worker / metadata / price';label.style.cssText='position:fixed;top:0;left:0;z-index:99;background:#ffe49c;color:#222;font-size:10px;pointer-events:none;padding:2px';document.body.append(label);});
 await page.screenshot({path:info.outputPath('rich-tentative.png'),fullPage:true});await panel.screenshot({path:info.outputPath('rich-panel.png')});await page.setViewportSize({width:320,height:740});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:info.outputPath('rich-tentative-320.png'),fullPage:true});await panel.screenshot({path:info.outputPath('rich-panel-320.png')});await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});

for(const price of [null,'0.00'] as const)test(`candidate missing JP/FX and ${price===null?'missing':'zero'} physical price stay truthful (SYNTHETIC)`,async({page})=>{
 await installSyntheticFlow(page);await page.route('https://api.scryfall.com/cards/continuous-a',r=>r.fulfill({json:{...a,prices:{usd:price}}}));
 await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();const panel=page.locator('.tentative');
 await expect(panel).toContainText('日本語名は利用できません');await expect(panel).toContainText('為替を取得できません');
 if(price===null){await expect(panel).toContainText('この版・言語・加工の価格なし');await expect(panel.locator('.usd')).toHaveCount(0);}
 else {await expect(panel.locator('.usd')).toHaveText('$0.00 USD');await expect(panel).toContainText('概算JPYは利用できません');}
 await expect(panel).not.toContainText('概算 ￥');await expect(page.locator('.scan-history-row')).toHaveCount(0);await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('late A Japanese/image metadata cannot appear on B; B preview preserves confirmed A history and manual finish (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);
 const richB={...b,set:'bbb',set_name:'Synthetic Beta Expansion',collector_number:'9',prices:{usd:'7'},image_uris:{normal:'https://cards.scryfall.io/normal/beta.jpg'},legalities:{standard:'not_legal',vintage:'restricted'}};
 await page.route('https://api.scryfall.com/cards/continuous-b',r=>r.fulfill({json:richB}));
 await page.route('https://api.scryfall.com/cards/search?**',async r=>{
  if(new URL(r.request().url()).searchParams.get('q')?.includes('oracle-a')){await pending;await r.fulfill({json:{data:[{...a,id:'ja-a',lang:'ja',printed_name:'遅い合成アルファ'}],has_more:false}}).catch(()=>{});}
  else await r.fulfill({json:{data:[richB,{...richB,id:'ja-b',lang:'ja',printed_name:'合成ベータ'}],has_more:false}});
 });
 await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative .usd')).toHaveText('$1.00 USD');
 await closeRoute(page); await page.getByRole('button',{name:'これです',exact:true}).click();await openRoute(page,'確定カード'); await page.getByLabel('加工',{exact:true}).selectOption('foil');
 const history=await page.locator('.scan-history-row').allTextContents();
 await page.evaluate(()=>{Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b'});});
 const panel=page.locator('.tentative');await expect(panel).toContainText('英語：Synthetic Beta');await expect(panel).toContainText('合成ベータ');await expect(panel.locator('.usd')).toHaveText('$7.00 USD');release();
 await expect(panel).toContainText('Synthetic Beta Expansion (BBB) #9 · en · nonfoil');await expect(panel.locator('img')).toHaveAttribute('src',richB.image_uris.normal);
 await expect(panel.locator('[data-format="standard"]')).toHaveAttribute('data-status','not_legal');await expect(panel.locator('[data-format="vintage"]')).toHaveAttribute('data-status','restricted');await expect(panel).not.toContainText('遅い合成アルファ');await expect(panel).not.toContainText('$1.00');
 await expect(page.getByLabel('加工',{exact:true})).toHaveValue('foil');expect(await page.locator('.scan-history-row').allTextContents()).toEqual(history);await expect(page.locator('.result .identity')).toContainText('Synthetic Alpha');await expect(page.locator('.target')).toContainText('TST #1 · en · Foil');
 await closeRoute(page); await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.scan-history-row')).toHaveCount(2);await expect(page.locator('.result h2')).toHaveText('合成ベータ');await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('progressive candidate FX preserves focus, scroll and physical image DOM (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);
 await page.route('https://api.frankfurter.dev/**',async r=>{await pending;await r.fulfill({json:{base:'USD',quote:'JPY',rate:150,date:'2026-10-02'}});});
 await page.goto('/');await closeRoute(page); await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative .usd')).toHaveText('$1.00 USD');
 await page.getByRole('button',{name:'候補パネルを拡大'}).click();
 const control=page.getByRole('button',{name:'これです',exact:true});await control.focus();const y=await page.evaluate(()=>{(window as any).candidateImage=document.querySelector('.tentative img');document.querySelector('.candidate-details')!.scrollTop=10;return scrollY;});const internal=await page.locator('.candidate-details').evaluate(n=>n.scrollTop);release();
 await expect(page.locator('.tentative .price')).toHaveText('概算 ￥150');expect(await page.locator('.candidate-details').evaluate(n=>n.scrollTop)).toBe(internal);await expect(control).toBeFocused();expect(await page.evaluate(()=>scrollY)).toBe(y);expect(await page.evaluate(()=>(window as any).candidateImage===document.querySelector('.tentative img'))).toBe(true);await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await closeRoute(page); await page.getByRole('button',{name:'停止',exact:true}).click();
});

for(const outcome of ['success','failure','confirm'] as const)test(`sticky verified A remains actionable during absent frames and pending B ${outcome} (SYNTHETIC)`,async({page})=>{
 await installSyntheticFlow(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);let requested=false;
 await page.route('https://api.scryfall.com/cards/continuous-b',async r=>{requested=true;await pending;await r.fulfill(outcome==='failure'?{status:503,json:{}}:{json:b}).catch(()=>{});});
 await page.goto('/');await closeRoute(page);await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 const panel=page.locator('.tentative');await expect(panel).toContainText('Synthetic Alpha');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{present:false}));await page.waitForTimeout(800);
 await expect(panel).toBeVisible();await expect(panel).toContainText('Synthetic Alpha');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{present:true,score:.1}));await page.waitForTimeout(400);await expect(panel).toContainText('Synthetic Alpha');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b',score:.8}));await expect.poll(()=>requested).toBe(true);
 await expect(panel).toBeVisible();await expect(panel).toContainText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(0);
 if(outcome==='confirm') {await page.evaluate(()=>Object.assign((window as any).continuousProbe,{present:false}));await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.result h2')).toHaveText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(1);}
 release();
 if(outcome==='success')await expect(panel).toContainText('Synthetic Beta');else {await page.waitForTimeout(800);if(outcome==='confirm')await expect(panel).toBeHidden();else await expect(panel).toContainText('Synthetic Alpha');}
});

test('sticky replacement is atomic and superseded physical metadata never wins (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);let requested=false;
 const c={...b,id:'continuous-c',oracle_id:'oracle-c',name:'Synthetic Gamma'};
 await page.route('https://api.scryfall.com/cards/continuous-b',async r=>{requested=true;await pending;await r.fulfill({json:b}).catch(()=>{});});
 await page.route('https://api.scryfall.com/cards/continuous-c',r=>r.fulfill({json:c}));
 await page.goto('/');await closeRoute(page);await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 const panel=page.locator('.tentative');await expect(panel).toContainText('Synthetic Alpha');
 await page.evaluate(()=>{
  const panel=document.querySelector<HTMLElement>('.tentative')!;const hidden:boolean[]=[];Object.assign(window,{stickyHidden:hidden});
  new MutationObserver(records=>{for(const record of records)if(record.attributeName==='hidden')hidden.push(panel.hidden===true);}).observe(panel,{attributes:true});
  Object.assign((window as any).continuousProbe,{cornersValid:false});
 });await page.waitForTimeout(400);await expect(panel).toBeVisible();
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{cornersValid:true,id:null,oracle:null,score:null}));await page.waitForTimeout(400);await expect(panel).toContainText('Synthetic Alpha');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b',score:.8}));await expect.poll(()=>requested).toBe(true);await expect(panel).toContainText('Synthetic Alpha');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{id:'continuous-c',oracle:'oracle-c'}));await expect(panel).toContainText('Synthetic Gamma');release();await page.waitForTimeout(700);
 await expect(panel).toContainText('Synthetic Gamma');await expect(panel).not.toContainText('Synthetic Beta');expect(await page.evaluate(()=>(window as any).stickyHidden)).not.toContain(true);
 await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('body')).not.toContainText('continuous-c');
 await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.result h2')).toHaveText('Synthetic Gamma');
});
