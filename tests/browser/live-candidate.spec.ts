import { test, expect, type Page } from '@playwright/test';
// SYNTHETIC canvas camera, worker results and provider metadata. Not model accuracy evidence.
const a={id:'continuous-a',oracle_id:'oracle-a',name:'Synthetic Alpha',lang:'en',set:'tst',set_name:'Synthetic',collector_number:'1',finishes:['nonfoil','foil'],prices:{usd:'1',usd_foil:'2'},legalities:{},image_uris:{small:'https://cards.scryfall.io/small/synthetic.jpg',normal:'https://cards.scryfall.io/small/synthetic.jpg'}};
const b={...a,id:'continuous-b',oracle_id:'oracle-b',name:'Synthetic Beta'};
async function installSyntheticFlow(page: Page) {
 await page.addInitScript(()=>{
  const state={id:'continuous-a',oracle:'oracle-a',present:true,hold:false,frames:0,score:.623,margin:.01,latency:10};Object.assign(window,{continuousProbe:state});
  navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d')!.fillRect(0,0,1280,720);return c.captureStream(5);};
  class SyntheticWorker {
   onmessage:((e:{data:unknown})=>void)|null=null;
   postMessage(data:{type:string;bitmap?:ImageBitmap}){data.bitmap?.close();if(data.type==='frame')state.frames++;if(state.hold&&data.type==='frame')return;
    const snapshot={...state};setTimeout(()=>this.onmessage?.({data:data.type==='init'?{type:'ready',catalogVersion:52}:{type:'result',cardId:snapshot.id,scryfallOracleId:snapshot.oracle,cardPresent:snapshot.present,cornersValid:snapshot.present,corners:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],score:snapshot.score,margin:snapshot.margin}}),data.type==='init'?10:snapshot.latency);}
   terminate(){}
  }Object.defineProperty(window,'Worker',{value:SyntheticWorker});
 });
 await page.route('https://api.scryfall.com/**',route=>{const url=new URL(route.request().url());return route.fulfill({json:url.pathname.endsWith('/search')?{data:url.searchParams.get('q')?.includes('oracle-b')?[b]:[a],has_more:false}:url.pathname.endsWith('/continuous-b')?b:a});});
 await page.route('https://cards.scryfall.io/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="68"><rect width="48" height="68" fill="#526685"/><text x="2" y="30" font-size="8" fill="white">TEST</text></svg>'}));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({status:503,json:{}}));
}
test('one observation proposal, dismiss, rearm, keyboard confirm, camera stays live (SYNTHETIC)',async({page},info)=>{
 await installSyntheticFlow(page);await page.goto('/');await page.screenshot({path:info.outputPath('initial.png')});
 await page.getByText('認識設定（デバッグ）',{exact:true}).click();await page.screenshot({path:info.outputPath('debugopen.png'),fullPage:true});await page.getByText('認識設定（デバッグ）',{exact:true}).click();await page.evaluate(()=>scrollTo(0,0));
 await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await expect(page.locator('.tentative')).toContainText('類似度 0.623');
 await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();expect(await page.evaluate(()=>scrollY)).toBe(0);
 await page.screenshot({path:info.outputPath('tentative.png')});
 await page.getByRole('button',{name:'違う',exact:true}).click();await page.waitForTimeout(800);await expect(page.locator('.tentative')).toBeHidden();
 await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await page.waitForTimeout(1000);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'これです',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.locator('.result h2')).toHaveText('Synthetic Alpha');await expect(page.locator('.scan-history-row')).toHaveCount(1);await expect(page.locator('.tentative')).toBeHidden();await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
 await page.screenshot({path:info.outputPath('confirmed.png')});await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('pointer identity and dismissed delayed metadata cannot select another card (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.dispatchEvent('pointerdown');
 await page.evaluate(()=>{const s=(window as any).continuousProbe;s.id='continuous-b';s.oracle='oracle-b';});await expect(page.locator('.tentative')).toContainText('Synthetic Beta');
 await confirm.dispatchEvent('click');await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.getByRole('button',{name:'違う',exact:true}).click();await page.waitForTimeout(600);await expect(page.locator('.tentative')).toBeHidden();
 await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('dismiss while metadata pending never resurrects or fabricates result (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);
 await page.route('https://api.scryfall.com/cards/continuous-a',async route=>{await pending;await route.fulfill({json:a});});
 await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('continuous-a');
 await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.tentative')).toContainText('取得完了後');
 await page.getByRole('button',{name:'違う',exact:true}).click();release();await page.waitForTimeout(600);await expect(page.locator('.tentative')).toBeHidden();await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('settings invalid/reset and tentative threshold apply with preserved history/manual selection (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 const threshold=page.getByLabel('提案の類似度',{exact:true});await threshold.fill('.7');await threshold.dispatchEvent('change');
 await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await page.waitForTimeout(700);await expect(page.locator('.tentative')).toBeHidden();
 await threshold.fill('.8');await threshold.dispatchEvent('change');await expect(threshold).toHaveValue('0.7');
 await page.getByRole('button',{name:'認識設定を初期値に戻す'}).click();await expect(threshold).toHaveValue('0.5');await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await page.getByRole('button',{name:'これです',exact:true}).click();await page.getByLabel('加工',{exact:true}).selectOption('foil');
 await page.getByLabel('推論完了後の待ち時間 (ms)',{exact:true}).fill('250');await page.getByLabel('推論完了後の待ち時間 (ms)',{exact:true}).dispatchEvent('change');
 await expect(page.getByLabel('加工',{exact:true})).toHaveValue('foil');await expect(page.locator('.scan-history-row')).toHaveCount(1);await expect(page.getByRole('button',{name:'停止',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'停止',exact:true}).click();
});
for(const [control,value,score,margin,consecutive] of [
 ['自動受付の類似度','.8',.79,.1,2],['異なるOracleとの最小 margin','.2',.95,.1,2],['自動受付の同じ印刷版の連続観測数','4',.95,.1,4],
] as const) test(`control affects automatic logic: ${control} (SYNTHETIC)`,async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByText('認識設定（デバッグ）',{exact:true}).click();const input=page.getByLabel(control,{exact:true});await input.fill(value);await input.dispatchEvent('change');
 await page.evaluate(({score,margin})=>{Object.assign((window as any).continuousProbe,{score,margin});},{score,margin});await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 if(consecutive===4){await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBeGreaterThanOrEqual(2);await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.scan-history-row')).toHaveCount(1);}
 else {await page.waitForTimeout(800);await expect(page.locator('.scan-history-row')).toHaveCount(0);await page.getByRole('button',{name:'認識設定を初期値に戻す'}).click();await expect(page.locator('.scan-history-row')).toHaveCount(1);}
 await expect(page.locator('.tentative')).toBeHidden();await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('delay and both absence controls change capture/rearm; overlay expiry changes painting (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 const set=async(name:string,value:string)=>{const input=page.getByLabel(name,{exact:true});await input.fill(value);await input.dispatchEvent('change');};
 await set('推論完了後の待ち時間 (ms)','700');await set('同じカードの再受付に必要な不在観測数','2');await set('不在の最小継続時間 (ms)','0');await set('四隅の表示期限 (ms)','100');
 await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'違う',exact:true}).click();
 const before=await page.evaluate(()=>(window as any).continuousProbe.frames);await page.waitForTimeout(400);expect(await page.evaluate(()=>(window as any).continuousProbe.frames)).toBe(before);await expect(page.locator('.detection-overlay')).toHaveAttribute('data-detected','false');
 await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBeGreaterThanOrEqual(before+2);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('320px proposal stays in document flow and network is coalesced (SYNTHETIC)',async({page},info)=>{
 await page.setViewportSize({width:320,height:740});await installSyntheticFlow(page);let requests=0;page.on('request',r=>{if(r.url().endsWith('/cards/continuous-a'))requests++;});
 await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.waitForTimeout(600);expect(requests).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(320);await page.screenshot({path:info.outputPath('tentative-320.png')});await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('settings discard in-flight old evidence without restarting camera (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByText('認識設定（デバッグ）',{exact:true}).click();await page.evaluate(()=>{(window as any).continuousProbe.latency=1000;});
 await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBe(1);
 await page.evaluate(()=>{Object.assign(window,{oldStream:document.querySelector('video')!.srcObject});Object.assign((window as any).continuousProbe,{score:.4});});
 const input=page.getByLabel('推論完了後の待ち時間 (ms)',{exact:true});await input.fill('200');await input.dispatchEvent('change');await page.waitForTimeout(1100);await expect(page.locator('.tentative')).toBeHidden();await expect.poll(()=>page.evaluate(()=>(window as any).continuousProbe.frames)).toBeGreaterThanOrEqual(2);
 expect(await page.evaluate(()=>document.querySelector('video')!.srcObject===(window as any).oldStream)).toBe(true);await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('file proposal confirms one observation and ignores its late automatic repeat (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.evaluate(()=>{Object.assign((window as any).continuousProbe,{score:.95,margin:.1,latency:600});});
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=2;return c.toDataURL().split(',')[1]!;});
 await page.locator('#local-image').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'これです',exact:true}).click();await page.getByLabel('加工',{exact:true}).selectOption('foil');
 await page.waitForTimeout(800);await expect(page.getByLabel('加工',{exact:true})).toHaveValue('foil');await expect(page.locator('.scan-history-row')).toHaveCount(1);
});
test('absence elapsed control alone delays rearm and reset restores every real value (SYNTHETIC)',async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByText('認識設定（デバッグ）',{exact:true}).click();
 const set=async(name:string,value:string)=>{const input=page.getByLabel(name,{exact:true});await input.fill(value);await input.dispatchEvent('change');};
 await set('同じカードの再受付に必要な不在観測数','2');await set('不在の最小継続時間 (ms)','2000');
 await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');await page.getByRole('button',{name:'違う',exact:true}).click();
 await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await page.waitForTimeout(650);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});await page.waitForTimeout(300);await expect(page.locator('.tentative')).toBeHidden();
 await set('不在の最小継続時間 (ms)','0');await page.evaluate(()=>{(window as any).continuousProbe.present=false;});await page.waitForTimeout(650);await page.evaluate(()=>{(window as any).continuousProbe.present=true;});await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await page.getByRole('button',{name:'認識設定を初期値に戻す'}).click();
 for(const [name,value] of [['提案の類似度','0.5'],['自動受付の類似度','0.75'],['異なるOracleとの最小 margin','0.025'],['自動受付の同じ印刷版の連続観測数','2'],['推論完了後の待ち時間 (ms)','180'],['同じカードの再受付に必要な不在観測数','3'],['不在の最小継続時間 (ms)','600'],['四隅の表示期限 (ms)','1500']])await expect(page.getByLabel(name!,{exact:true})).toHaveValue(value!);
 await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('mobile proposal confirmation is visible without scrolling and panel text has contrast (SYNTHETIC)',async({page})=>{
 await page.setViewportSize({width:390,height:844});await installSyntheticFlow(page);await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 await expect(page.getByRole('button',{name:'これです',exact:true})).toBeInViewport();expect(await page.evaluate(()=>scrollY)).toBe(0);
 const contrast=await page.locator('.tentative').evaluate(node=>{
  const rgb=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number);
  const lum=(values:number[])=>values.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0);
  const style=getComputedStyle(node);const fg=lum(rgb(style.color));let parent:Element|null=node;let bg='';while(parent){bg=getComputedStyle(parent).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)')break;parent=parent.parentElement;}const background=lum(rgb(bg));return (Math.max(fg,background)+.05)/(Math.min(fg,background)+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);await page.getByRole('button',{name:'停止',exact:true}).click();
});

for (const key of ['Space', 'Enter'] as const) test(`held ${key} autorepeat cannot confirm replacement B (SYNTHETIC native keyboard)`, async ({page}, info) => {
 await installSyntheticFlow(page);await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 // Enter clicks on keydown. Make A metadata unavailable so that its first activation
 // cannot accept A; replacement must still not let the held gesture accept B.
 if(key==='Enter') {
  await page.getByRole('button',{name:'停止',exact:true}).click();await page.reload();
  await page.route('https://api.scryfall.com/cards/continuous-a',route=>route.abort());
  await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('取得できません');
 }
 await page.evaluate(()=>{Object.assign(window,{activationEvents:[]});document.addEventListener('keydown',event=>{(window as any).activationEvents.push({key:event.key,repeat:event.repeat});});});
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.focus();await page.keyboard.down(key);
 await page.evaluate(()=>{Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b'});});await expect(page.locator('.tentative')).toContainText('Synthetic Beta');
 await page.keyboard.down(key);await page.keyboard.up(key);
 await info.attach('native-key-events',{body:JSON.stringify(await page.evaluate(()=>(window as any).activationEvents)),contentType:'application/json'});
 expect(await page.evaluate(()=>(window as any).activationEvents.map((event:any)=>event.repeat))).toEqual([false,true]);
 await expect(page.locator('.tentative')).toContainText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();
 // A new gesture after release can confirm the current verified candidate.
 await page.keyboard.press(key);await expect(page.locator('.result h2')).toHaveText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await page.getByRole('button',{name:'停止',exact:true}).click();
});

for(const cancel of ['blur','window blur','pointercancel'] as const) test(`canceled Space gesture via ${cancel} cannot activate replacement (SYNTHETIC)`,async({page})=>{
 await installSyntheticFlow(page);await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();await expect(page.locator('.tentative')).toContainText('Synthetic Alpha');
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.focus();await page.keyboard.down('Space');
 if(cancel==='blur'){await page.getByRole('button',{name:'違う',exact:true}).focus();await confirm.focus();}
 else if(cancel==='window blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
 else await confirm.dispatchEvent('pointercancel');
 await page.evaluate(()=>Object.assign((window as any).continuousProbe,{id:'continuous-b',oracle:'oracle-b'}));await expect(page.locator('.tentative')).toContainText('Synthetic Beta');
 await page.keyboard.down('Space');await page.keyboard.up('Space');await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();
 await page.keyboard.press('Space');await expect(page.locator('.result h2')).toHaveText('Synthetic Beta');await expect(page.locator('.scan-history-row')).toHaveCount(1);await page.getByRole('button',{name:'停止',exact:true}).click();
});
