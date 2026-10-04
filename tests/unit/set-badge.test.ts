import { it, expect } from 'vitest';
import { SetIcons, safeSetIcon } from '../../src/ui/set-badge.js';
// Synthetic metadata responses; not live provider evidence.
it('accepts only remote SVG from the exact trusted HTTPS host',()=>{
 expect(safeSetIcon('https://svgs.scryfall.io/sets/lea.svg?1')).toBe('https://svgs.scryfall.io/sets/lea.svg?1');
 for(const url of ['http://svgs.scryfall.io/sets/a.svg','https://evil.test/a.svg','https://svgs.scryfall.io.evil.test/a.svg','https://user@svgs.scryfall.io/a.svg','https://svgs.scryfall.io/a.png','data:image/svg+xml,test'])expect(safeSetIcon(url)).toBeNull();
});

it('coalesces and caches each set, including failure; rejects mismatched identity',async()=>{
 let count=0;
 const icons=new SetIcons(async code=>{count++;return code==='bad'?Promise.reject(new Error('offline')):{object:'set',code,icon_svg_uri:'https://svgs.scryfall.io/sets/lea.svg'};});
 expect(await Promise.all([icons.get('lea'),icons.get('lea')])).toEqual(['https://svgs.scryfall.io/sets/lea.svg','https://svgs.scryfall.io/sets/lea.svg']);
 await icons.get('lea');expect(count).toBe(1);
 expect(await icons.get('bad')).toBeNull();await icons.get('bad');expect(count).toBe(2);
 expect(await new SetIcons(async()=>({object:'set',code:'other',icon_svg_uri:'https://svgs.scryfall.io/sets/lea.svg'})).get('lea')).toBeNull();
});
