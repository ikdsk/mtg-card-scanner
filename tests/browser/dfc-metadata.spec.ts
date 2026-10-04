import {test,expect,type Page} from '@playwright/test';
import en from '../fixtures/delver-en.json' with {type:'json'};
import ja from '../fixtures/delver-ja.json' with {type:'json'};
import type {Card} from '../../src/data/cards.js';
import {openRoute,closeRoute} from './immersive-routes.js';
// Public provider snapshots replayed; synthetic camera/recognition, no accuracy evidence.
async function install(page:Page,physical:Card=en,printings:Card[]=[en,...ja]) {
 await page.addInitScript(({id,oracle})=>{
  const state={id,oracle,faceIndex:0,present:true,frames:0};Object.assign(window,{dfcProbe:state});
  navigator.mediaDevices.getUserMedia=async()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d')!.fillRect(0,0,1280,720);return c.captureStream(5);};
  class MockWorker {onmessage:((e:{data:unknown})=>void)|null=null;postMessage(d:{type:string;bitmap?:ImageBitmap}){d.bitmap?.close();const s={...state};if(d.type==='frame')state.frames++;setTimeout(()=>this.onmessage?.({data:d.type==='init'?{type:'ready',catalogVersion:52}:{type:'result',cardId:s.id,scryfallOracleId:s.oracle,faceIndex:s.faceIndex,cardPresent:s.present,cornersValid:s.present,score:.8,margin:.1}}),10);}terminate(){}}
  Object.defineProperty(window,'Worker',{value:MockWorker});
 },{id:physical.id,oracle:physical.oracle_id});
 await page.route('https://api.scryfall.com/**',r=>r.fulfill({json:new URL(r.request().url()).pathname.endsWith('/search')?{data:printings,has_more:false}:physical}));
 await page.route('https://api.frankfurter.dev/**',r=>r.fulfill({status:503,json:{}}));
 await page.route('https://cards.scryfall.io/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="48" height="68"><rect width="48" height="68" fill="grey"/></svg>'}));
}
async function start(page:Page){await page.goto('/');await closeRoute(page);await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();}
for(const language of ['en','ja'] as const)test(`DFC Japanese face names use usable fallback without changing physical ${language} image/price`,async({page})=>{
 const physical=language==='en'?en:ja[0]!;await install(page,physical);await start(page);
 await expect(page.locator('.tentative strong').first()).toHaveText('日本語：秘密を掘り下げる者 // 昆虫の逸脱者');
 await expect(page.locator('.tentative img')).toHaveAttribute('src',physical.card_faces[0]!.image_uris.normal);
 await expect(page.locator('.tentative')).toContainText(`${physical.set.toUpperCase()}) #${physical.collector_number} · ${physical.lang}`);
 if(physical.prices.usd)await expect(page.locator('.tentative .usd')).toHaveText(`$${physical.prices.usd} USD`);else await expect(page.locator('.tentative')).toContainText('この版・言語・加工の価格なし');
 await page.getByRole('button',{name:'これです',exact:true}).click();await openRoute(page,'確定カード');
 await expect(page.locator('.result h2')).toHaveText('秘密を掘り下げる者 // 昆虫の逸脱者');
 await expect(page.locator('.scan-history-row')).toContainText('秘密を掘り下げる者 // 昆虫の逸脱者');
 await expect(page.locator('.result img')).toHaveAttribute('src',physical.card_faces[0]!.image_uris.normal);
 await expect(page.getByLabel('選択版の言語')).toHaveValue(physical.lang);
});
test('recognized back initializes image; manual switch survives same-face observations and price; new face replaces version',async({page})=>{
 await install(page);await page.goto('/');await page.evaluate(()=>{(window as any).dfcProbe.faceIndex=1;});await closeRoute(page);await page.getByRole('button',{name:'カメラでスキャン',exact:true}).click();
 const image=page.locator('.tentative img');await expect(image).toHaveAttribute('src',en.card_faces[1]!.image_uris.normal);
 await page.locator('.tentative').getByRole('button',{name:/^表面：/}).click();await expect(image).toHaveAttribute('src',en.card_faces[0]!.image_uris.normal);
 await page.waitForTimeout(800);await expect(image).toHaveAttribute('src',en.card_faces[0]!.image_uris.normal);
 await page.evaluate(()=>{(window as any).dfcProbe.faceIndex=0;});await page.waitForTimeout(400);
 await page.evaluate(()=>{(window as any).dfcProbe.faceIndex=1;});await expect(image).toHaveAttribute('src',en.card_faces[1]!.image_uris.normal);
 await page.getByRole('button',{name:'これです',exact:true}).click();await openRoute(page,'確定カード');
 await expect(page.locator('.result img')).toHaveAttribute('src',en.card_faces[1]!.image_uris.normal);
 await page.locator('.result').getByRole('button',{name:/^表面：/}).click();await page.getByLabel('加工',{exact:true}).selectOption('foil');
 await expect(page.locator('.result img')).toHaveAttribute('src',en.card_faces[0]!.image_uris.normal);
});
test('held Space cannot confirm replaced face of same physical DFC',async({page})=>{
 await install(page);await start(page);await expect(page.locator('.tentative strong').first()).toContainText('秘密を掘り下げる者');
 const confirm=page.getByRole('button',{name:'これです',exact:true});await confirm.focus();await page.keyboard.down('Space');
 await page.evaluate(()=>{(window as any).dfcProbe.faceIndex=1;});await expect(page.locator('.tentative img')).toHaveAttribute('src',en.card_faces[1]!.image_uris.normal);
 await page.keyboard.down('Space');await page.keyboard.up('Space');await expect(page.locator('.scan-history-row')).toHaveCount(0);
 await page.keyboard.press('Space');await expect(page.locator('.scan-history-row')).toHaveCount(1);
});
test('held Enter cannot add confirmation after accepted DFC changes face',async({page})=>{
 await install(page);await start(page);await expect(page.locator('.tentative strong').first()).toContainText('秘密を掘り下げる者');
 await page.getByRole('button',{name:'これです',exact:true}).focus();await page.keyboard.down('Enter');await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await page.evaluate(()=>{(window as any).dfcProbe.faceIndex=1;});await page.waitForTimeout(500);
 await page.keyboard.down('Enter');await page.keyboard.up('Enter');await expect(page.locator('.scan-history-row')).toHaveCount(1);
 await expect(page.locator('.result img')).toHaveAttribute('src',en.card_faces[0]!.image_uris.normal);
});
for(const failure of ['rejected','name-is-id','oracle-is-name','blank'] as const)test(`unverified ${failure} metadata never becomes recognition result`,async({page})=>{
 await install(page);
 await page.route(`https://api.scryfall.com/cards/${en.id}`,r=>r.fulfill(failure==='rejected'?{status:503,json:{}}:{json:{...en,name:failure==='name-is-id'?en.id:failure==='oracle-is-name'?en.oracle_id:'  '}}));
 await start(page);await expect(page.locator('.empty-candidate')).toContainText(failure==='rejected'?'取得できません':'確認できません');
 await expect(page.locator('.tentative')).toBeHidden();await expect(page.getByRole('button',{name:'これです',exact:true})).toBeHidden();
 await expect(page.locator('body')).not.toContainText(en.id);await expect(page.locator('body')).not.toContainText(en.oracle_id);await expect(page.locator('.scan-history-row')).toHaveCount(0);
});
test('DFC missing Japanese names is explicit and English is never labeled Japanese',async({page})=>{
 await install(page,ja[0]!,[ja[0]!]);await start(page);
 await expect(page.locator('.tentative strong').first()).toHaveText('日本語名は利用できません');
 await expect(page.locator('.tentative img')).toHaveAttribute('src',ja[0]!.card_faces[0]!.image_uris.normal);
 await expect(page.locator('.tentative')).not.toContainText('日本語：Delver');
});
test('dismissed DFC cannot resurrect from deferred Japanese metadata',async({page})=>{
 await install(page);let release!:()=>void;const pending=new Promise<void>(r=>release=r);
 await page.route('https://api.scryfall.com/cards/search?**',async r=>{await pending;await r.fulfill({json:{data:[en,...ja],has_more:false}}).catch(()=>{});});
 await start(page);await expect(page.locator('.tentative img')).toHaveAttribute('src',en.card_faces[0]!.image_uris.normal);
 await page.getByRole('button',{name:'違う',exact:true}).click();release();await page.waitForTimeout(700);
 await expect(page.locator('.tentative')).toBeHidden();await expect(page.locator('.scan-history-row')).toHaveCount(0);await expect(page.locator('.result')).toBeHidden();
});
