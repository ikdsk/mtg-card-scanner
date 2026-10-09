import { expect, it } from 'vitest';
import en from '../fixtures/delver-en.json';
import ja from '../fixtures/delver-ja.json';
import hearth from '../fixtures/hearth-elemental.json';
import type { Card } from '../../src/data/cards.js';
import { externalSearchName, externalLinks } from '../../src/data/external-links.js';
// Pure URL construction only; no network.
const plain={...en,name:'Lightning Bolt',card_faces:undefined} as unknown as Card;
it('uses the English name when no Japanese display card exists, URL-encoded',()=>{
 expect(externalSearchName(plain,null)).toBe('Lightning Bolt');
 const links=externalLinks(plain,null);
 expect(links.wisdomGuild).toBe('https://whisper.wisdom-guild.net/search.php?q=Lightning%20Bolt');
 expect(links.hareruya).toBe('https://www.hareruyamtg.com/ja/products/search?product=Lightning%20Bolt');
});
it('prefers the Japanese name and percent-encodes it',()=>{
 const bolt={...plain,lang:'ja',printed_name:'稲妻'} as unknown as Card;
 expect(externalSearchName(plain,bolt)).toBe('稲妻');
 expect(externalLinks(plain,bolt).wisdomGuild).toBe('https://whisper.wisdom-guild.net/search.php?q=%E7%A8%B2%E5%A6%BB');
 expect(externalLinks(bolt,bolt).hareruya).toBe('https://www.hareruyamtg.com/ja/products/search?product=%E7%A8%B2%E5%A6%BB');
});
it('uses the front face only for multi-face cards',()=>{
 expect(externalSearchName(en,null)).toBe('Delver of Secrets');
 expect(externalSearchName(en,ja[1]!)).toBe('秘密を掘り下げる者');
});
it('partial Japanese faces fall back to the front face name',()=>{
 const en=hearth.en as unknown as Card,ja=hearth.ja as unknown as Card;
 expect(externalSearchName(en,null)).toBe('Hearth Elemental');
 expect(externalSearchName(en,ja)).toBe('Hearth Elemental');
});
it('escapes reserved characters so the query cannot be altered',()=>{
 const odd={...plain,name:'Who & What / When, Where & Why?'} as Card;
 expect(externalLinks(odd,null).wisdomGuild).toBe('https://whisper.wisdom-guild.net/search.php?q=Who%20%26%20What%20%2F%20When%2C%20Where%20%26%20Why%3F');
});
