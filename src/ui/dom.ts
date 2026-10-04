export function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
export function button(text: string, action: () => void, className = ''): HTMLButtonElement {
  const node = el('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
}
export function label(text: string, control: HTMLElement): HTMLLabelElement {
  const node = el('label', text); node.append(control); return node;
}
