import { test, expect } from '@playwright/test';

for (const width of [320,390]) test(`Mana Peek idle intro and explicit pending camera lifecycle ${width} (SYNTHETIC)`, async ({page},info) => {
 await page.setViewportSize({width,height:844});
 await page.addInitScript(()=>{
  Object.assign(window,{introProbe:{calls:0}});
  navigator.mediaDevices.getUserMedia=()=>{(window as any).introProbe.calls++;return new Promise(()=>{});};
  class PendingWorker {postMessage(){} terminate(){}}
  Object.defineProperty(window,'Worker',{value:PendingWorker});
 });
 await page.goto('/');
 await expect(page).toHaveTitle('Mana Peek');
 await expect(page.locator('header h1')).toHaveText('Mana Peek');
 await expect(page.locator('header h1')).toBeInViewport();
 const intro=page.locator('.camera-intro');
 await expect(intro).toBeVisible();
 await expect(intro).toContainText('MTGカードをかざして、日本語情報や参考価格を確認。');
 await expect(intro).toContainText('結果をタップすると詳細が開きます。残したいカードは「履歴に保存」。');
 expect(await page.evaluate(()=>(window as any).introProbe.calls)).toBe(0);
 await page.screenshot({path:info.outputPath(`mana-peek-idle${width}.png`)});
 await page.getByRole('button',{name:'スキャン開始',exact:true}).click();
 await expect(intro).toBeHidden();await expect(page.locator('header h1')).toBeInViewport();
 await expect(page.locator('.camera-status')).toContainText('許可・起動');
 await page.screenshot({path:info.outputPath(`mana-peek-starting${width}.png`)});
 await page.getByRole('button',{name:'停止',exact:true}).click();await expect(intro).toBeVisible();
});

test('bottom navigation contains only search and history; gear retains settings',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.panel-navigation button')).toHaveText(['名前検索','履歴']);
 await expect(page.getByRole('button',{name:'確定カード',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'設定',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'情報・設定',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'設定',exact:true})).toBeVisible();
});

test('idle intro links to the sister Pokéca Scanner app', async ({page}) => {
 await page.goto('/');
 const link=page.locator('.camera-intro #intro-pokeca-link');
 await expect(link).toBeVisible();
 await expect(link).toHaveText('ポケカ版はこちら →');
 await expect(link).toHaveAttribute('href','https://ikdsk.github.io/pokeca-scanner/');
 await expect(link).toHaveAttribute('target','_blank');
 await expect(link).toHaveAttribute('rel','noopener noreferrer');
});
