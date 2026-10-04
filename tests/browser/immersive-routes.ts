import type { Page } from '@playwright/test';
// User-superseded perpetual sections now require deliberate navigation.
export async function openRoute(page:Page,name:'名前検索'|'履歴'|'設定'|'確定カード'):Promise<void>{
 const dialog=page.locator('.utility-drawer');
 if(await dialog.isVisible()){
  if(await page.locator('#drawer-heading').textContent()===name)return;
  await closeRoute(page);
 }
 await page.getByRole('button',{name,exact:true}).click();
}
export async function closeRoute(page:Page):Promise<void>{
 if(await page.locator('.utility-drawer').isVisible())await page.getByRole('button',{name:'補助画面を閉じる',exact:true}).click();
}
