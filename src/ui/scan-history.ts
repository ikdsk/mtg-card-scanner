import { japaneseName } from '../data/japanese-name.js';
import { el, button } from './dom.js';
import { referenceFaces, safeScryfallUrl } from './reference-image.js';
import type { ScanHistoryEntry, PendingScanHistoryEntry } from './scan-history-model.js';
import './scan-history.css';
export class ScanHistoryView {
  readonly node = el('section', '', 'panel scan-history');
  private readonly list = el('ol', '', 'scan-history-list');
  private readonly rows = new Map<number, { node: HTMLLIElement; signature: string }>();
  constructor(private readonly reopen: (entry: ScanHistoryEntry) => void, limit = 100) {
    this.node.hidden = true;
    const heading = el('h2', 'スキャン履歴'); heading.id = 'scan-history-heading';
    this.node.setAttribute('aria-labelledby', heading.id);
    this.node.append(heading, el('p', `最新${limit}件まで。このタブ内のみ・再読み込みで消えます。`, 'small muted'), this.list);
  }
  update(entries: (ScanHistoryEntry | PendingScanHistoryEntry)[], displayNames: ReadonlyMap<string,string> = new Map()): void {
    this.node.hidden = entries.length === 0;
    const retained = new Set(entries.map(entry => entry.generation));
    for (const [id, row] of this.rows) if (!retained.has(id)) { row.node.remove(); this.rows.delete(id); }
    entries.forEach((entry, index) => {
      const name=entry.card ? displayNames.get(entry.card.id) ?? japaneseName(entry.card) ?? entry.card.name : null;
      const signature = JSON.stringify([entry,name]);
      let row = this.rows.get(entry.generation);
      if (!row || row.signature !== signature) {
        const focused = row?.node.contains(document.activeElement);
        const node = el('li'); const card = entry.card;
        if (!card) {
          const pending = el('div', '', 'scan-history-row');
          pending.append(el('strong', 'カード情報を確認中'), el('p', entry.status, 'small muted'));
          node.append(pending); row?.node.replaceWith(node); row = {node,signature}; this.rows.set(entry.generation,row);
          if (this.list.children[index] !== node) this.list.insertBefore(node,this.list.children[index] ?? null);
          return;
        }
        const resolved = entry as ScanHistoryEntry;
        const displayName=name ?? card.name;
        const finish = { nonfoil: '通常', foil: 'Foil', etched: 'Etched' }[resolved.finish] ?? resolved.finish;
        const selection = `${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number} · ${card.lang} · ${finish}`;
        const control = button('', () => this.reopen(resolved), 'scan-history-row');
        control.setAttribute('aria-label', `${displayName} · ${selection} を開く`);
        const thumbnail = el('span', '', 'scan-history-thumbnail');
        // Same host/protocol validation as the main reference image, full card only.
        const url = safeScryfallUrl(card.image_uris?.small, 'image') ?? referenceFaces(card)[0]?.url;
        const fallback = el('span', '画像なし', 'small'); thumbnail.append(fallback);
        if (url) {
          const image = el('img'); image.alt = ''; image.width = 48; image.height = 67;
          image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
          image.onload = () => { fallback.hidden = true; };
          image.onerror = () => { image.hidden = true; fallback.hidden = false; };
          image.src = url; thumbnail.append(image);
        }
        const text = el('span', '', 'scan-history-text'); text.append(el('strong', displayName), el('span', selection, 'small muted'));
        control.append(thumbnail, text); node.append(control);
        row?.node.replaceWith(node); row = { node, signature }; this.rows.set(entry.generation, row);
        if (focused) control.focus({ preventScroll: true });
      }
      if (this.list.children[index] !== row.node) this.list.insertBefore(row.node, this.list.children[index] ?? null);
    });
  }
}
