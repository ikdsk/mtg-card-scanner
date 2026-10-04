import type { Card, Face } from './cards.js';
export function japaneseFaceName(face: Face): string | null {
 const name=face.printed_name?.trim();
 return name && name!==face.name.trim() && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(name) ? name : null;
}
export function japaneseName(card: Card): string | null {
 if(card.lang!=='ja')return null;
 const root=japaneseFaceName(card);if(root)return root;
 const faces=card.card_faces?.map(japaneseFaceName);
 return faces?.length && faces.every(Boolean) ? faces.join(' // ') : null;
}
export function japaneseDisplay(physical: Card, cards: readonly Card[]): Card | null {
 const usable=[physical,...cards].filter(c=>c.oracle_id===physical.oracle_id && japaneseName(c));
 return usable.find(c=>c.set===physical.set && c.collector_number===physical.collector_number) ?? usable.find(c=>c.set===physical.set) ?? usable[0] ?? null;
}
