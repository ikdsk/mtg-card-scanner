import { expect, it } from 'vitest';
import en from '../fixtures/delver-en.json';
import ja from '../fixtures/delver-ja.json';
import { japaneseName, japaneseDisplay } from '../../src/data/japanese-name.js';
// Public Scryfall snapshots supplied by parent; replay, not live provider verification.
it('derives both Japanese DFC face names and rejects English placeholder names',()=>{
 expect(japaneseName(ja[0]!)).toBeNull();
 expect(japaneseName(ja[1]!)).toBe('秘密を掘り下げる者 // 昆虫の逸脱者');
 expect(japaneseDisplay(en,ja)?.id).toBe(ja[1]!.id);
 expect(japaneseDisplay(ja[0]!,ja)?.id).toBe(ja[1]!.id);
});
it('prefers usable same physical set/number, never unrelated Oracle; incomplete/English face names are unavailable',()=>{
 const fallback=ja[1]!;const same={...fallback,id:'synthetic-same',set:en.set,collector_number:en.collector_number};
 expect(japaneseDisplay(en,[fallback,same])?.id).toBe(same.id);
 expect(japaneseDisplay(en,[{...same,oracle_id:'unrelated'}])).toBeNull();
 expect(japaneseName({...same,card_faces:[same.card_faces[0]!,{...same.card_faces[1]!,printed_name:'Insectile Aberration'}]})).toBeNull();
 expect(japaneseName({...same,printed_name:en.name,card_faces:[]})).toBeNull();
});
it('prefers usable Japanese in the physical set before an older-set fallback',()=>{
 const fallback=ja[1]!;const sameSet={...fallback,id:'synthetic-same-set',set:en.set,collector_number:'alternate-number'};
 expect(japaneseDisplay(en,[fallback,sameSet])?.id).toBe(sameSet.id);
});
