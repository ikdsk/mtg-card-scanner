import { el, button } from './dom.js';
const formats = [
  ['standard', 'Standard', 'スタンダード', 'S'],
  ['pioneer', 'Pioneer', 'パイオニア', 'P'],
  ['modern', 'Modern', 'モダン', 'M'],
  ['legacy', 'Legacy', 'レガシー', 'L'],
  ['vintage', 'Vintage', 'ヴィンテージ', 'V'],
  ['commander', 'Commander', '統率者', 'C'],
  ['pauper', 'Pauper', 'パウパー', 'Pa'],
] as const;
type Status = 'legal' | 'banned' | 'not_legal' | 'restricted' | 'unknown';
const explanations: Record<Status, string> = {
  legal: '使用可', banned: '禁止', not_legal: '使用不可',
  restricted: '制限付き使用可（デッキとサイドボードを合わせて1枚まで）', unknown: '使用可否不明',
};
export function formatStatuses(legalities?: Readonly<Record<string, string>>) {
  return formats.map(([key, name, japanese, badge]) => {
    const raw = legalities?.[key];
    const status: Status = raw === 'legal' || raw === 'banned' || raw === 'not_legal' || raw === 'restricted' ? raw : 'unknown';
    return { key, name, japanese, badge, status, explanation: explanations[status] };
  });
}
// Persistent disclosure and controls: price refreshes do not reset focus/open state.
// Letter badges are app-made navigation aids, never official format marks.
export class FormatLegality {
  constructor(private readonly disclosureId = 'format-disclosure') {}
  readonly node = el('section', '', 'format-legality');
  private signature = '';
  private open: string | null = null;
  update(cardId: string, legalities?: Readonly<Record<string, string>>): void {
    const rows = formatStatuses(legalities);
    const signature = JSON.stringify([cardId, rows]);
    if (signature === this.signature) return;
    this.signature = signature; this.open = null;
    const heading = el('p', 'フォーマットの使用可否', 'small');
    const row = el('div', '', 'format-icons'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', '紙の主要フォーマット');
    const disclosure = el('p', '', 'format-disclosure small'); disclosure.id = this.disclosureId; disclosure.hidden = true;
    for (const format of rows) {
      const control = button('', () => {
        this.open = this.open === format.key ? null : format.key;
        for (const sibling of row.querySelectorAll('button')) sibling.setAttribute('aria-expanded', String(sibling === control && this.open !== null));
        disclosure.hidden = this.open === null;
        disclosure.textContent = this.open ? `${format.name}（${format.japanese}）：${format.explanation} · Scryfallの使用可否。バッジはこのアプリ独自の表示です。` : '';
      }, `format-icon format-${format.status}`);
      control.dataset.format = format.key; control.dataset.status = format.status;
      control.setAttribute('aria-label', `${format.name}（${format.japanese}）：${format.explanation}`);
      control.setAttribute('aria-expanded', 'false'); control.setAttribute('aria-controls', disclosure.id);
      const badge = el('span', format.badge, 'format-badge'); badge.setAttribute('aria-hidden', 'true'); control.append(badge);
      if (format.status !== 'legal') {
        const mark = el('span', format.status === 'restricted' ? '¹' : format.status === 'banned' ? '×' : format.status === 'not_legal' ? '–' : '?', 'format-mark'); mark.setAttribute('aria-hidden', 'true'); control.append(mark);
      }
      row.append(control);
    }
    this.node.replaceChildren(heading, row, disclosure);
  }
  clear(): void { this.signature = ''; this.open = null; this.node.replaceChildren(); }
}
