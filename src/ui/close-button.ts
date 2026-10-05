import { button } from './dom.js';

export function closeIconButton(action: () => void): HTMLButtonElement {
  const control = button('', action, 'close-icon-button');
  control.setAttribute('aria-label', '閉じる'); control.title = '閉じる';
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) icon.setAttribute(name, value);
  const cross = document.createElementNS(icon.namespaceURI, 'path');
  cross.setAttribute('d', 'M6 6l12 12M18 6L6 18');
  icon.append(cross); control.append(icon); return control;
}
