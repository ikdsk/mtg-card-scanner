import type { Card } from '../data/cards.js';
import { el, button } from './dom.js';
import { referenceFaces, safeScryfallUrl } from './reference-image.js';
import { japaneseOrEnglish, visiblePrintings } from './printings-list-model.js';
// Other printings of the shown Oracle card. Tapping one asks the owner to show it;
// the list never fetches. Selection state updates in place so focus survives.
export class PrintingsList {
  readonly node = el('section', '', 'candidate-printings');
  private cards: Card[] = [];
  private currentId = '';
  private expanded = false;
  constructor(private readonly select: (card: Card) => void) { this.node.hidden = true; }
  clear(): void { this.cards = []; this.currentId = ''; this.expanded = false; this.node.hidden = true; this.node.replaceChildren(); }
  loading(): void { this.cards = []; this.expanded = false; this.node.hidden = false; this.node.replaceChildren(el('h3', '他の印刷版'), el('p', '版の一覧を取得中…', 'small muted')); }
  fail(): void { this.cards = []; this.node.hidden = false; this.node.replaceChildren(el('h3', '他の印刷版'), el('p', '版の一覧を取得できません。', 'small muted')); }
  update(cards: readonly Card[], currentId: string): void {
    if (cards[0]?.oracle_id !== this.cards[0]?.oracle_id) this.expanded = false;
    this.cards = japaneseOrEnglish(cards); this.currentId = currentId; this.node.hidden = false; this.render();
  }
  setCurrent(id: string): void {
    this.currentId = id;
    for (const item of this.node.querySelectorAll<HTMLButtonElement>('.printing-item')) {
      if (item.dataset.id === id) item.setAttribute('aria-current', 'true'); else item.removeAttribute('aria-current');
    }
  }
  private render(): void {
    const { shown, hidden } = visiblePrintings(this.cards, this.expanded);
    const list = el('ul', '', 'printing-list');
    for (const card of shown) {
      const item = el('li');
      const label = `${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number} · ${card.lang}`;
      const control = button('', () => this.select(card), 'printing-item');
      control.dataset.id = card.id; control.setAttribute('aria-label', `${label} を表示`);
      if (card.id === this.currentId) control.setAttribute('aria-current', 'true');
      const url = safeScryfallUrl(card.image_uris?.small, 'image') ?? referenceFaces(card)[0]?.url;
      if (url) { const image = el('img'); image.alt = ''; image.width = 63; image.height = 88; image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer'; image.onerror = () => image.remove(); image.src = url; control.append(image); }
      control.append(el('span', label, 'small'));
      item.append(control); list.append(item);
    }
    const nodes: HTMLElement[] = [el('h3', '他の印刷版'), list];
    if (!this.cards.some(card => card.id !== this.currentId)) nodes.splice(1, 0, el('p', '他の印刷版はありません。', 'small muted'));
    if (hidden > 0) nodes.push(button('もっと見る', () => {
      const first = shown.length; this.expanded = true; this.render();
      this.node.querySelectorAll<HTMLButtonElement>('.printing-item')[first]?.focus({ preventScroll: true });
    }, 'printing-more'));
    this.node.replaceChildren(...nodes);
  }
}
