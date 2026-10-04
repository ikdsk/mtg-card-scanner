import { test, expect, type Page } from '@playwright/test';
// SYNTHETIC camera/worker/cards/set metadata/icons/FX. No recognition claim.
const a={id:'badge-a',oracle_id:'oracle-a',name:'Physical Alpha',lang:'en',set:'lea',set_name:'Limited Edition Alpha',collector_number:'1',finishes:['nonfoil'],prices:{usd:'2'},legalities:{}};
const b={...a,id:'badge-b',oracle_id:'oracle-b',name:'Physical Beta',set:'leb',set_name:'Limited Edition Beta'};
async function setup(page:Page,imageFailure=false){
 let imageRequests=0;
 await page.addInitScript(()=>{
  Object.assign(window,{badgeCard:'badge-a'});
  navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=400;c.height=600;c.getContext('2d')!.fillRect(0,0,400,600);return c.captureStream(10);};
  class MockWorker{onmessage:((e:{data:unknown})=>void)|null=null;postMessage(d:{type:string;bitmap?:ImageBitmap}){d.bitmap?.close();setTimeout(()=>{const id=(window as any).badgeCard;this.onmessage?.({data:d.type==='init'?{type:'ready',catalogVersion:52}:{type:'result',cardId:id,scryfallOracleId:id==='badge-a'?'oracle-a':'oracle-b',cardPresent:true,cornersValid:true,corners:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]],score:.99,margin:.9}});},20);}terminate(){}}
  Object.defineProperty(window,'Worker',{value:MockWorker});
 });
 await page.route('https://api.scryfall.com/cards/**',r=>{const url=r.request().url();const card=url.includes('badge-b')||url.includes('oracle-b')?b:a;return r.fulfill({json:url.includes('/search')?{data:[{...card,id:`jp-${card.id}`,lang:'ja',set:'jpn',set_name:'Japanese fallback edition',printed_name:'合成日本語名'}],has_more:false}:card});});
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({json:{base:'USD',quote:'JPY',rate:150,date:'2026-10-02'}}));
 await page.route('https://svgs.scryfall.io/**',r=>{imageRequests++;return imageFailure?r.abort('failed'):r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8"/></svg>'});});
 await page.goto('/');await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 await expect(page.locator('.tentative')).toContainText('合成日本語名');
 return ()=>imageRequests;
}
for(const width of [320,390])test(`compact physical set icon and readable label ${width} (SYNTHETIC)`,async({page},info)=>{
 await page.setViewportSize({width,height:width===320?740:844});
 let calls=0;await page.route('https://api.scryfall.com/sets/*',r=>{calls++;const code=r.request().url().split('/').at(-1)!;return r.fulfill({json:{object:'set',code,icon_svg_uri:`https://svgs.scryfall.io/sets/${code}.svg`}});});
 await setup(page);
 const badge=page.locator('.candidate-summary .candidate-set');
 await expect(badge).toHaveText('Limited Edition Alpha (LEA)');
 await expect(page.getByRole('group',{name:'実物の拡張：Limited Edition Alpha (LEA)',exact:true})).toBeVisible();
 await expect(badge.locator('img')).toBeVisible();await expect.poll(()=>badge.locator('img').evaluate(n=>(n as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);await expect(badge).toBeInViewport();
 expect(await badge.evaluate(n=>{const r=n.getBoundingClientRect(),p=n.closest('.candidate-summary')!.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom&&n.scrollWidth<=n.clientWidth;})).toBe(true);
 await expect(page.locator('.candidate-details')).toBeHidden();await expect(page.getByRole('button',{name:'これです',exact:true})).toBeEnabled();
 await page.screenshot({path:info.outputPath(`compact-${width}.png`)});
 await page.evaluate(()=>{(window as any).badgeCard='badge-b';});await expect(page.locator('.tentative')).toContainText('Physical Beta');
 await page.evaluate(()=>{(window as any).badgeCard='badge-a';});await expect(badge).toHaveText('Limited Edition Alpha (LEA)');
 expect(calls).toBe(2);await page.getByRole('button',{name:'停止',exact:true}).click();
});
test('late A metadata cannot populate B or a cleared candidate (SYNTHETIC)',async({page})=>{
 let release!:()=>Promise<void>;const pending=new Promise<void>(resolve=>{void page.route('https://api.scryfall.com/sets/lea',r=>{release=async()=>{await r.fulfill({json:{object:'set',code:'lea',icon_svg_uri:'https://svgs.scryfall.io/sets/lea.svg'}});resolve();};});});
 await page.route('https://api.scryfall.com/sets/leb',r=>r.fulfill({json:{object:'set',code:'leb',icon_svg_uri:'https://svgs.scryfall.io/sets/leb.svg'}}));
 await setup(page);await expect.poll(()=>typeof release).toBe('function');
 await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await page.evaluate(()=>{(window as any).badgeCard='badge-b';});
 const badge=page.locator('.candidate-set');await expect(badge).toHaveText('Limited Edition Beta (LEB)');await expect(badge.locator('img')).toHaveAttribute('src','https://svgs.scryfall.io/sets/leb.svg');
 await release();await pending;
 await expect.poll(()=>badge.locator('img').count()).toBe(1);
 await expect(badge.locator('img')).toHaveAttribute('src','https://svgs.scryfall.io/sets/leb.svg');
 await page.getByRole('button',{name:'停止',exact:true}).click();await expect(badge).toBeEmpty();
});
for(const failure of ['missing','network','image','unsafe'] as const)test(`${failure} icon leaves readable physical label and confirmation working (SYNTHETIC)`,async({page},info)=>{
 await page.setViewportSize({width:320,height:740});
 await page.route('https://api.scryfall.com/sets/*',r=>failure==='network'?r.abort('failed'):r.fulfill({json:{object:'set',code:'lea',...(failure==='missing'?{}:{icon_svg_uri:failure==='unsafe'?'https://evil.test/set.svg':'https://svgs.scryfall.io/sets/lea.svg'})}}));
 const imageRequests=await setup(page,failure==='image');if(failure==='image')await expect.poll(imageRequests).toBeGreaterThan(0);const badge=page.locator('.candidate-set');await expect(badge).toHaveText('Limited Edition Alpha (LEA)');
 await expect(badge.locator('img')).toHaveCount(0);await expect(badge).toBeInViewport();
 await page.getByRole('button',{name:'これです',exact:true}).click();await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await page.screenshot({path:info.outputPath(`${failure}-fallback.png`)});await page.getByRole('button',{name:'停止',exact:true}).click();
});
