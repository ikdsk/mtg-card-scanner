import type { Page } from '@playwright/test';
// User-superseded perpetual sections now require deliberate navigation.
export async function openRoute(page:Page,name:'名前検索'|'履歴'|'設定'):Promise<void>{
 if(await page.locator('.candidate-detail-sheet').isVisible())await page.getByRole('button',{name:'閉じる',exact:true}).click();
 const dialog=page.locator('.utility-drawer');
 if(await dialog.isVisible()){
  if(await page.locator('#drawer-heading').textContent()===name)return;
  await closeRoute(page);
 }
 if(name==='設定'){await page.getByRole('button',{name:'情報・設定',exact:true}).click();return;}
 await page.getByRole('button',{name,exact:true}).click();
}
export async function closeRoute(page:Page):Promise<void>{
 if(await page.locator('.candidate-detail-sheet').isVisible())await page.getByRole('button',{name:'閉じる',exact:true}).click();
 if(await page.locator('.utility-drawer').isVisible())await page.getByRole('button',{name:'補助画面を閉じる',exact:true}).click();
}
// "他の候補" lists candidates; the name-search fallback replaces the old direct dismissal.
export async function searchFromCandidate(page:Page):Promise<void>{
 await page.getByRole('button',{name:'他の候補',exact:true}).click();
 await page.getByRole('button',{name:'見つからない場合は名前検索',exact:true}).click();
}
