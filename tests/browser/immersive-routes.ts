import type { Page } from '@playwright/test';
// User-superseded perpetual sections now require deliberate navigation.
export async function openRoute(page:Page,name:'名前検索'|'履歴'|'設定'|'確定カード'):Promise<void>{
 if(await page.locator('.candidate-detail-sheet').isVisible())await page.getByRole('button',{name:'閉じる',exact:true}).click();
 const dialog=page.locator('.utility-drawer');
 if(await dialog.isVisible()){
  if(await page.locator('#drawer-heading').textContent()===name)return;
  await closeRoute(page);
 }
 if(name==='設定'){await page.getByRole('button',{name:'情報・設定',exact:true}).click();return;}
 if(name==='確定カード'){
  if(await page.getByRole('button',{name:'詳細を見る',exact:true}).isEnabled()){
   await page.getByRole('button',{name:'詳細を見る',exact:true}).click();
   await page.getByRole('button',{name:'版・言語・加工を変更',exact:true}).click();
  }else{
   await page.getByRole('button',{name:'履歴',exact:true}).click();
   await page.getByRole('button',{name:'選択中のカードを確認',exact:true}).click();
  }
  return;
 }
 await page.getByRole('button',{name,exact:true}).click();
}
export async function closeRoute(page:Page):Promise<void>{
 if(await page.locator('.candidate-detail-sheet').isVisible())await page.getByRole('button',{name:'閉じる',exact:true}).click();
 if(await page.locator('.utility-drawer').isVisible())await page.getByRole('button',{name:'補助画面を閉じる',exact:true}).click();
}
