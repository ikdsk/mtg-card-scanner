import type { Card, Face } from './cards.js';
export function japaneseFaceName(face: Face): string | null {
 const name=face.printed_name?.trim();
 return name && name!==face.name.trim() && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(name) ? name : null;
}
// Card-level heading name. Faces are translated independently in Scryfall data, so a
// multi-face card with at least one Japanese face name keeps it, and any untranslated
// face stays as its English name. All-English / empty cards remain null.
export function japaneseName(card: Card): string | null {
 if(card.lang!=='ja')return null;
 const root=japaneseFaceName(card);if(root)return root;
 const faces=card.card_faces;
 if(!faces?.length)return null;
 const names=faces.map(japaneseFaceName);
 return names.some(Boolean) ? names.map((name,i)=>name??faces[i]!.name).join(' // ') : null;
}
export function japaneseDisplay(physical: Card, cards: readonly Card[]): Card | null {
 const usable=[physical,...cards].filter(c=>c.oracle_id===physical.oracle_id && japaneseName(c));
 return usable.find(c=>c.set===physical.set && c.collector_number===physical.collector_number) ?? usable.find(c=>c.set===physical.set) ?? usable[0] ?? null;
}
