import type { Card } from './cards.js';
import { japaneseName } from './japanese-name.js';
// Search-result links only. Building a URL performs no request; the user's click navigates.
export type ExternalLinks = { wisdomGuild: string; hareruya: string };
const FACE_SEPARATOR=' // ';
// Japanese display name when known, otherwise the English Oracle name; front face only for
// multi-face cards, since both sites index individual face names, not the joined heading.
export function externalSearchName(card: Card, japanese: Card | null): string {
 const name=(japanese?japaneseName(japanese):null)??japaneseName(card)??card.name;
 return name.split(FACE_SEPARATOR)[0]!.trim();
}
export function externalLinks(card: Card, japanese: Card | null): ExternalLinks {
 const q=encodeURIComponent(externalSearchName(card,japanese));
 return {
  wisdomGuild:`https://whisper.wisdom-guild.net/search.php?q=${q}`,
  hareruya:`https://www.hareruyamtg.com/ja/products/search?name=${q}`,
 };
}
