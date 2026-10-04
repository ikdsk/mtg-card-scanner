import type { Card, Face } from '../data/cards.js';
import { el, button } from './dom.js';
export function safeScryfallUrl(value: unknown, kind: 'image' | 'link'): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== (kind === 'image' ? 'cards.scryfall.io' : 'scryfall.com') || url.port || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
function fullCardImage(face: Face): string | null {
  // Full-card formats only: retain artist/copyright, never use art/border crops.
  for (const value of [face.image_uris?.normal, face.image_uris?.grid, face.image_uris?.large, face.image_uris?.display, face.image_uris?.png]) {
    const url = safeScryfallUrl(value, 'image');
    if (url) return url;
  }
  return null;
}
export function referenceFaces(card: Card): { name: string; url: string | null }[] {
  const full = fullCardImage(card);
  if (full) return [{ name: card.printed_name ?? card.name, url: full }];
  return (card.card_faces?.length ? card.card_faces : [card]).map(face => ({ name: face.printed_name ?? face.name, url: fullCardImage(face) }));
}
// Persistent DOM: independent price/FX renders never restart an image or face state.
export class ReferenceImage {
  readonly node = el('figure', '', 'reference-image');
  private identity = '';
  private signature = '';
  private face = 0;
  private epoch = 0;
  clear(): void { this.identity = ''; this.signature = ''; this.face = 0; this.epoch++; this.node.replaceChildren(); }
  update(card: Card): void {
    const identity = `${card.id}:${card.lang}`;
    const faces = referenceFaces(card);
    const signature = JSON.stringify([identity, faces, safeScryfallUrl(card.scryfall_uri, 'link')]);
    if (signature === this.signature) return;
    if (identity !== this.identity) this.face = 0;
    if (this.face >= faces.length) this.face = 0;
    this.identity = identity; this.signature = signature;
    this.draw(card, faces);
  }
  private draw(card: Card, faces: ReturnType<typeof referenceFaces>): void {
    const epoch = ++this.epoch;
    const current = faces[this.face] ?? faces[0]!;
    const caption = el('figcaption', '参照画像');
    const region = el('div', '', 'reference-region');
    const status = el('p', current.url ? '参照画像を読み込み中…' : 'この面の参照画像はありません', 'small muted');
    region.append(status);
    if (current.url) {
      const image = el('img'); image.alt = `${card.name} — ${current.name} の参照画像`; image.width = 488; image.height = 680; image.decoding = 'async'; image.referrerPolicy = 'no-referrer'; image.hidden = true;
      image.onload = () => { if (epoch !== this.epoch) return; image.hidden = false; status.hidden = true; };
      image.onerror = () => { if (epoch !== this.epoch) return; image.hidden = true; status.hidden = false; status.textContent = '参照画像を読み込めません。カード情報・価格は引き続き確認できます。'; };
      image.src = current.url; region.append(image);
    }
    const switches = el('div', '', 'actions');
    if (faces.length > 1) faces.forEach((face, index) => {
      const control = button(`${index === 0 ? '表面' : '裏面'}：${face.name}`, () => {
        this.face = index; this.draw(card, faces);
        this.node.querySelectorAll<HTMLButtonElement>('button')[index]?.focus({ preventScroll: true });
      });
      control.setAttribute('aria-pressed', String(index === this.face)); switches.append(control);
    });
    const credit = el('p', '', 'small muted'); const link = el('a', 'Scryfall');
    link.href = safeScryfallUrl(card.scryfall_uri, 'link') ?? `https://scryfall.com/search?q=${encodeURIComponent(`id:${card.id}`)}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    credit.append(document.createTextNode('画像提供：'), link, document.createTextNode(' · 実物の版・言語・加工を確認してください。'));
    this.node.replaceChildren(caption, region, switches, credit);
  }
}
