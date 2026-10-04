import './ui/style.css';
import { el, button, label } from './ui/dom.js';
import { Repository, FxProvider } from './data/repository.js';
import type { Card, Face } from './data/cards.js';
import { ScanHistory } from './ui/scan-history-model.js';
import { ScanHistoryView } from './ui/scan-history.js';
import { FormatLegality } from './ui/format-legality.js';
import { ReferenceImage } from './ui/reference-image.js';
import { ResultSession } from './ui/session.js';
import { formatReferencePrice } from './domain/pricing.js';
import { Recognizer } from './recognition/adapter.js';
import { StabilityGate } from './recognition/gate.js';
import { captureCameraFrame } from './ui/camera-geometry.js';

const marks: { event: string; ms: number; detail?: unknown }[] = [];
function mark(event: string, detail?: unknown): void { marks.push({ event, ms: performance.now(), detail }); if (marks.length > 300) marks.shift(); performance.clearMarks(event); performance.mark(event); }
mark('shell-start');
const repo = new Repository(); const fx = new FxProvider();
const app = document.querySelector<HTMLDivElement>('#app')!;
const header = el('header'); header.append(el('h1', 'MTG Scanner'));
const scan = el('section', '', 'panel scan-panel');
const viewport = el('div', '', 'viewport');
const video = el('video'); video.muted = true; video.playsInline = true; video.autoplay = true;
const guide = el('div', '', 'guide'); guide.append(el('span', 'カードの四隅を画面内に入れてください'));
guide.hidden = true; viewport.append(video, guide);
video.addEventListener('resize', () => {
  if (video.videoWidth && video.videoHeight && video.srcObject) {
    viewport.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
    viewport.style.setProperty('--camera-ratio', String(video.videoWidth / video.videoHeight));
  }
});
const cameraStatus = el('p', 'カメラは停止中', 'status camera-status'); cameraStatus.setAttribute('role', 'status');
const modelStatus = el('p', '認識データはスキャン開始時に準備します', 'muted small'); modelStatus.setAttribute('role', 'status');
const scanActions = el('div', '', 'actions');
const start = button('カメラでスキャン', () => { void startCamera(); }, 'primary');
const stop = button('停止', () => stopCamera('カメラを停止しました'));
const modelRetry = button('認識の準備を再試行', () => { recognizer.dispose(); const generation = scanGeneration; void prepare().then(ok => { if (ok && active && generation === scanGeneration) void loop(generation); }); }); modelRetry.hidden = true;
const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.id = 'local-image';
const fileLabel = label('端末の画像でスキャン', file); fileLabel.className = 'file-button';
scanActions.append(start, stop, fileLabel, modelRetry);
const cameraInfo = el('div', '', 'camera-info'); cameraInfo.append(cameraStatus, modelStatus);
scan.append(viewport, cameraInfo);
const searchPanel = el('section', '', 'panel search-panel'); searchPanel.append(el('h2', 'カード名で検索'));
const searchForm = el('form', '', 'search-form'); const query = el('input'); query.type = 'search'; query.placeholder = '例：稲妻 / Lightning Bolt'; query.required = true; query.setAttribute('aria-label', '日本語・英語のカード名');
const submit = el('button', '検索', 'primary'); submit.type = 'submit'; searchForm.append(query, submit);
const searchStatus = el('p', '', 'status'); searchStatus.setAttribute('role', 'status');
const searchResults = el('div', '', 'search-results'); const more = button('検索結果をさらに表示', () => { void searchMore(); }); more.hidden = true;
searchPanel.append(searchForm, searchStatus, searchResults, more);
const result = el('section', '', 'panel result'); result.hidden = true; result.setAttribute('aria-label', 'カード情報');
const footer = el('footer');
footer.append(el('p', '海外参考価格 · 国内販売・買取価格ではありません。自動認識は候補です。実物の版・言語・加工を確認してください。'));
const sources = el('p');
for (const [name, href] of [['Scryfall', 'https://scryfall.com'], ['Frankfurter / ECB', 'https://frankfurter.dev'], ['CollectorVision', 'https://github.com/HanClinto/CollectorVision']]) {
  const a = el('a', name); a.href = href!; a.target = '_blank'; a.rel = 'noopener noreferrer'; sources.append(a, document.createTextNode(' · '));
}
footer.append(sources, el('p', 'ローカル・内部検証版。認識コードとモデルはAGPL-3.0。公開・配布前にライセンス対応と公開承認が必要です。カードの権利はWizards of the Coast等の権利者に帰属します。', 'small'));
const notices = el('a', '第三者ライセンスと利用条件'); notices.href = '/recognition/THIRD-PARTY-NOTICES.md'; footer.append(notices);
const privacy = el('details'); privacy.append(el('summary', '通信・プライバシーの詳細'), el('p', 'カードIDや検索語をScryfallに、USD/JPYの通貨ペアをFrankfurterに送信します。認識用のコード・モデル・辞書はjsDelivr、Hugging Face、CollectorVisionCatalogから取得します。提供元には通常の通信情報が渡ります。参照画像はScryfallの画像配信元から取得します。撮影・選択画像は保存せず、解析ログはこのタブのメモリ内のみです。分析サービスへの送信はありません。'));
footer.append(privacy);
const debug = el('details'); debug.append(el('summary', '端末内の計測ログ')); const debugOutput = el('pre');
debug.append(button('計測を表示', () => { debugOutput.textContent = JSON.stringify(marks, null, 2); }), debugOutput); footer.append(debug);
const information = el('details', '', 'information'); information.id = 'information'; information.append(el('summary', '情報・プライバシー'), el('p', '画像は端末内だけで処理します。初回は認識データ約45MBと実行環境をダウンロードします。'), footer);
header.append(button('情報・設定', () => { information.open = !information.open; if (information.open) { information.scrollIntoView({ block: 'start' }); information.querySelector('summary')?.focus(); } }));
const actionPanel = el('section', '', 'action-panel'); actionPanel.append(scanActions);
const history = new ScanHistory();
let currentHistoryGeneration: number | null = null;
const historyView = new ScanHistoryView(entry => {
  currentHistoryGeneration = entry.generation;
  void openCard(entry.card, 'スキャン履歴から選択', true, entry.finish);
}, history.limit);
app.append(header, scan, result, actionPanel, historyView.node, searchPanel, information);

let stream: MediaStream | null = null; let scanGeneration = 0; let active = false; let modelReady = false;
let preparationGeneration = 0;
let frameBusy = false; let loopTimer: ReturnType<typeof setTimeout> | null = null;
let detailGeneration = 0; let detailRequest: AbortController | null = null;
let printingCards: Card[] = []; let jp: Card | null = null; let printStatus = ''; let source = '';
let searchGeneration = 0; let searchRequest: AbortController | null = null; let nextPage: string | null = null;
const gate = new StabilityGate();
const recognizer = new Recognizer(message => { modelStatus.textContent = message; });
const referenceImage = new ReferenceImage();
const formatLegality = new FormatLegality();
const session = new ResultSession((id, signal) => repo.card(id, signal), signal => fx.latest(signal), renderResult);

async function prepare(): Promise<boolean> {
  const attempt = ++preparationGeneration;
  modelRetry.hidden = true; mark('model-start');
  try { await recognizer.init(); if (attempt !== preparationGeneration) return false; modelReady = true; mark('model-ready'); return true; }
  catch (error) { if (attempt !== preparationGeneration) return false; modelReady = false; modelStatus.textContent = errorText(error, '認識データを準備できません。名前検索は利用できます。'); modelRetry.hidden = false; mark('model-error'); return false; }
}
function errorText(error: unknown, fallback: string): string {
  if (!navigator.onLine) return 'オフラインです。接続後に再試行してください。';
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'カメラの許可がありません。ブラウザの設定で許可し、再試行してください。名前検索・端末の画像も使えます。';
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'カメラが見つかりません。端末の画像または名前検索を利用してください。';
  if (error instanceof DOMException && error.name === 'NotReadableError') return 'カメラを使用できません。他のアプリを閉じて再試行してください。';
  if (error instanceof Error && error.name !== 'AbortError') return `${fallback} ${error.message}`;
  return fallback;
}
function stopCamera(message?: string): void {
  scanGeneration++; active = false; gate.reset();
  if (loopTimer) clearTimeout(loopTimer); loopTimer = null;
  stream?.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null;
  start.disabled = false; stop.disabled = true; guide.hidden = true; viewport.style.removeProperty('aspect-ratio'); viewport.style.removeProperty('--camera-ratio');
  if (message) cameraStatus.textContent = message;
  mark('camera-stop');
}
async function startCamera(): Promise<void> {
  currentHistoryGeneration = null;
  detailGeneration++; detailRequest?.abort(); session.reset();
  stopCamera(); const generation = scanGeneration; active = true; start.disabled = true; stop.disabled = false;
  cameraStatus.textContent = 'カメラの許可・起動を待っています'; mark('camera-start');
  const ready = prepare();
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('カメラにはHTTPSまたはlocalhostが必要です。');
    // Optional standard constraint (not yet in our TypeScript DOM typings).
    // Ask the browser to avoid cropping before the full-frame capture.
    const videoConstraints: MediaTrackConstraints & { resizeMode: ConstrainDOMString } = {
      facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, resizeMode: { ideal: 'none' },
    };
    const obtained = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    if (generation !== scanGeneration || !active) { obtained.getTracks().forEach(track => track.stop()); return; }
    stream = obtained; guide.hidden = false; video.srcObject = stream; await video.play();
    if (generation !== scanGeneration || !active) return;
    cameraStatus.textContent = 'カメラ映像を表示中 · カード全体を画面内へ'; mark('camera-video');
    const success = await ready;
    if (success && generation === scanGeneration && active) void loop(generation);
  } catch (error) {
    if (generation !== scanGeneration) return;
    stopCamera(errorText(error, 'カメラを起動できません。'));
  }
}
async function captureVideo(): Promise<ImageBitmap> {
  return captureCameraFrame(video);
}
async function loop(generation: number): Promise<void> {
  if (!active || generation !== scanGeneration) return;
  if (frameBusy || !video.videoWidth) { loopTimer = setTimeout(() => { void loop(generation); }, 150); return; }
  frameBusy = true;
  try {
    mark('frame-start'); const bitmap = await captureVideo();
    if (generation !== scanGeneration) { bitmap.close(); return; }
    const candidate = await recognizer.frame(bitmap); mark('frame-result', candidate.timing);
    if (generation !== scanGeneration || !active) return;
    const id = gate.observe(candidate);
    cameraStatus.textContent = id ? '候補を固定しました。版・言語・加工を確認してください。' : 'カード全体を画面内へ · 反射を避けて少し静止してください';
    if (id) { stopCamera('認識候補を固定しました · カメラは停止中'); mark('candidate-stable'); void openId(id, '端末内認識の候補 · 実物の版・言語・加工は未確認', generation); return; }
  } catch (error) {
    if (generation === scanGeneration) { modelReady = false; modelRetry.hidden = false; stopCamera(errorText(error, '認識できません。名前検索も利用できます。')); }
  } finally { frameBusy = false; }
  if (active && generation === scanGeneration) loopTimer = setTimeout(() => { void loop(generation); }, 180);
}
file.addEventListener('change', () => { const image = file.files?.[0]; file.value = ''; if (image) void scanFile(image); });
async function scanFile(image: File): Promise<void> {
  currentHistoryGeneration = null;
  detailGeneration++; detailRequest?.abort(); session.reset();
  // A local image starts a new recognition session; never compete with a
  // transferred camera frame that cannot be recalled from the old worker.
  recognizer.dispose(); modelReady = false;
  stopCamera(); const generation = scanGeneration;
  cameraStatus.textContent = '端末の画像を認識中（外部送信なし）';
  try {
    if (image.size > 25 * 1024 * 1024) throw new Error('25MB以下の画像を選んでください');
    if (!(await prepare()) || generation !== scanGeneration) return;
    const decoded = await createImageBitmap(image);
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 1024 / Math.max(decoded.width, decoded.height));
    canvas.width = Math.round(decoded.width * scale); canvas.height = Math.round(decoded.height * scale);
    canvas.getContext('2d')!.drawImage(decoded, 0, 0, canvas.width, canvas.height); decoded.close();
    gate.reset();
    let id: string | null = null;
    for (let i = 0; i < 2; i++) {
      if (generation !== scanGeneration) return;
      mark('file-frame-start'); const candidate = await recognizer.frame(await createImageBitmap(canvas)); mark('file-frame-result', candidate);
      if (generation !== scanGeneration) return;
      id = gate.observe(candidate);
    }
    // Two repeats validate deterministic inference, not independent photo accuracy.
    if (id) { cameraStatus.textContent = '画像の認識候補を固定しました'; void openId(id, '画像からの認識候補 · 版・言語・加工を確認してください', generation); }
    else cameraStatus.textContent = '候補を絞れませんでした。四隅・背景・反射を確認するか、名前検索で探してください。';
  } catch (error) { if (generation === scanGeneration) cameraStatus.textContent = errorText(error, '画像を認識できません。'); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera('背景に移動したため停止しました。カメラでスキャンから再開できます。'); });
window.addEventListener('pagehide', () => { stopCamera(); recognizer.dispose(); modelReady = false; });
window.addEventListener('offline', () => { searchStatus.textContent = 'オフラインです。接続後に検索を再試行してください。'; });
stop.disabled = true;

searchForm.addEventListener('submit', event => { event.preventDefault(); void search(); });
async function search(): Promise<void> {
  const term = query.value.trim(); if (!term) return;
  currentHistoryGeneration = null;
  detailGeneration++; detailRequest?.abort(); session.reset();
  stopCamera('名前検索中 · カメラは停止しています');
  searchRequest?.abort(); const request = new AbortController(); searchRequest = request; const generation = ++searchGeneration;
  nextPage = null; more.hidden = true; searchResults.replaceChildren(); searchStatus.textContent = 'Scryfallを検索中…'; submit.disabled = true;
  try {
    const page = await repo.search(term, request.signal);
    if (generation !== searchGeneration) return;
    appendSearch(page.cards); nextPage = page.next; more.hidden = !nextPage; searchStatus.textContent = `${page.cards.length}件 · カードを選択してください`;
  } catch (error) { if (generation === searchGeneration) searchStatus.textContent = errorText(error, '見つかりません。名前を確認して再検索してください。'); }
  finally { if (generation === searchGeneration) submit.disabled = false; }
}
async function searchMore(): Promise<void> {
  if (!nextPage || !searchRequest) return; const generation = searchGeneration; more.disabled = true;
  try { const page = await repo.page(nextPage, searchRequest.signal); if (generation !== searchGeneration) return; appendSearch(page.cards); nextPage = page.next; more.hidden = !nextPage; }
  catch (error) { if (generation === searchGeneration) searchStatus.textContent = errorText(error, '続きの取得に失敗しました。再試行してください。'); }
  finally { more.disabled = false; }
}
function appendSearch(cards: Card[]): void {
  for (const c of cards) {
    const b = button(`${c.printed_name ?? c.name}　${c.set.toUpperCase()} #${c.collector_number} · ${c.lang}`, () => { currentHistoryGeneration = null; void openCard(c, '手動検索で選択'); });
    searchResults.append(b);
  }
}
async function openId(id: string, origin: string, scanEvent: number): Promise<void> {
  session.reset();
  const generation = ++detailGeneration; detailRequest?.abort(); const request = new AbortController(); detailRequest = request;
  try {
    const c = await repo.card(id, request.signal);
    if (generation !== detailGeneration) return;
    const finish = c.finishes.includes('nonfoil') ? 'nonfoil' : c.finishes[0] ?? 'nonfoil';
    history.accept(scanEvent, c, finish); currentHistoryGeneration = scanEvent;
    historyView.update(history.entries);
    await openCard(c, origin, true, finish);
  }
  catch (error) { if (generation === detailGeneration) cameraStatus.textContent = errorText(error, '候補情報を取得できません。名前検索で再試行してください。'); }
}
async function openCard(c: Card, origin: string, reveal = true, selectedFinish?: string): Promise<void> {
  stopCamera('カメラは停止中 · カード情報を表示しています'); detailRequest?.abort(); const request = new AbortController(); detailRequest = request; const generation = ++detailGeneration;
  printingCards = [c]; jp = c.lang === 'ja' ? c : null; printStatus = '版・言語の一覧を全ページ取得中…'; source = origin;
  void session.select(c, selectedFinish ?? (c.finishes.includes('nonfoil') ? 'nonfoil' : c.finishes[0] ?? 'nonfoil'));
  result.hidden = false; renderResult();
  if (reveal) result.scrollIntoView({ block: 'start', behavior: 'instant' });
  try {
    const cards = await repo.printings(c.oracle_id, request.signal);
    if (generation !== detailGeneration) return;
    printingCards = cards.some(x => x.id === c.id) ? cards : [c, ...cards];
    jp = printingCards.find(x => x.lang === 'ja' && x.set === c.set && x.collector_number === c.collector_number) ?? printingCards.find(x => x.lang === 'ja') ?? null;
    printStatus = `${printingCards.length}版・言語（全ページ）`; renderResult();
  } catch (error) { if (generation === detailGeneration) { printStatus = errorText(error, '版一覧を取得できません。'); renderResult(); } }
}
function options(select: HTMLSelectElement, entries: [string, string][], selected: string): void {
  for (const [value, name] of entries) { const option = el('option', name); option.value = value; option.selected = value === selected; select.append(option); }
}
function choose(c: Card, finish = session.value.finish): void {
  const available = c.finishes.includes(finish) ? finish : c.finishes[0] ?? 'nonfoil';
  source = '手動指定 · 認識結果で変更されません';
  if (currentHistoryGeneration !== null) { history.update(currentHistoryGeneration, c, available); historyView.update(history.entries); }
  void session.select(c, available);
}
function renderResult(): void {
  const value = session.value; const c = value.card; if (!c) { referenceImage.clear(); formatLegality.clear(); result.hidden = true; result.replaceChildren(); return; }
  result.hidden = false; const scrollPosition = window.scrollY; const nodes: HTMLElement[] = [];
  const focused = result.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
  const focusLabel = focused?.getAttribute('aria-label');
  const focusText = focused && ['BUTTON', 'SUMMARY'].includes(focused.tagName) ? focused.textContent : null;
  const heading = el('div', '', 'result-heading'); const identity = el('div', '', 'identity');
  identity.append(el('h2', jp?.printed_name ?? c.printed_name ?? c.name), el('p', c.name, 'muted'), el('p', `${c.set.toUpperCase()} #${c.collector_number} · ${c.lang}`, 'small muted'), el('p', source, 'eyebrow'), button('スキャンに戻る', () => {
    start.scrollIntoView({ block: 'center', behavior: 'instant' }); start.focus({ preventScroll: true });
  }));
  referenceImage.update(c); heading.append(referenceImage.node, identity); nodes.push(heading);
  formatLegality.update(c.id, c.legalities); nodes.push(formatLegality.node);
  const controls = el('div', '', 'controls');
  const language = el('select'); language.setAttribute('aria-label', '選択版の言語');
  options(language, [...new Set(printingCards.map(x => x.lang))].map(l => [l, l === 'ja' ? '日本語 (ja)' : l === 'en' ? '英語 (en)' : l]), c.lang);
  language.onchange = () => {
    const match = printingCards.find(x => x.lang === language.value && x.set === c.set && x.collector_number === c.collector_number);
    const fallback = printingCards.find(x => x.lang === language.value);
    if (match ?? fallback) {
      choose((match ?? fallback)!);
      if (!match) { source = '手動指定 · 同じ版の指定言語がないため別版を選択しました。版を確認してください。'; renderResult(); }
    }
  };
  const printing = el('select'); printing.setAttribute('aria-label', '印刷版');
  options(printing, printingCards.filter(x => x.lang === c.lang).map(x => [x.id, `${x.set_name} (${x.set.toUpperCase()}) #${x.collector_number}`]), c.id);
  printing.onchange = () => { const chosen = printingCards.find(x => x.id === printing.value); if (chosen) choose(chosen); };
  const finish = el('select'); finish.setAttribute('aria-label', '加工'); const finishNames: Record<string, string> = { nonfoil: '通常 (Nonfoil)', foil: 'Foil', etched: 'Etched' };
  options(finish, c.finishes.map(f => [f, finishNames[f] ?? f]), value.finish); finish.onchange = () => choose(c, finish.value);
  controls.append(label('実物の言語', language), label('印刷版', printing), label('実物の加工', finish));
  nodes.push(controls, el('p', printStatus, 'small muted'));
  if (printStatus.includes('取得できません') || printStatus.includes('失敗')) nodes.push(button('版一覧を再取得', () => { void openCard(c, source, false, value.finish); }));
  nodes.push(el('p', `価格の参照対象：${c.set.toUpperCase()} #${c.collector_number} · ${c.lang} · ${finishNames[value.finish] ?? value.finish}`, 'target'));
  const priceBox = el('div', '', 'price-box'); const display = formatReferencePrice(value.quote, value.fx);
  priceBox.append(el('p', '海外参考価格', 'eyebrow'));
  priceBox.append(el('strong', value.loading ? '価格を取得中…' : value.error ? '価格を取得できません' : display.usd ? display.jpy ? `概算 ${display.jpy}` : '概算JPYは利用できません' : 'この版・言語・加工の価格なし', display.jpy ? 'price yen' : 'price'));
  if (display.usd && !value.loading && !value.error) priceBox.append(el('span', `${display.usd} USD`, 'usd'));
  priceBox.append(el('p', '国内販売・買取価格ではありません', 'small'));
  const priceDetails = el('details', '', 'price-details'); priceDetails.open = result.querySelector<HTMLDetailsElement>('.price-details')?.open ?? false; priceDetails.append(el('summary', '価格・為替の出典と日時'));
  if (value.retrievedAt) priceDetails.append(el('p', `Scryfall · 応答確認 ${new Date(value.retrievedAt).toLocaleString('ja-JP')} · 提供元の価格更新時刻は未取得（24時間キャッシュ）`, 'small muted'));
  if (value.fx) priceDetails.append(el('p', `Frankfurter / ECB · 1 USD = ${value.fx.jpyPerUsd} JPY · 最新公表日 ${value.fx.asOf}`, 'small muted'));
  else priceBox.append(el('p', value.fxError ? '為替を取得できません。USDのみ表示します。' : '為替の確認中（取得できなければUSDのみ）', 'small muted'));
  priceBox.append(priceDetails, button('価格・為替を再確認', () => { void session.select(c, value.finish); }));
  if (value.error) priceBox.append(el('p', value.error, 'error'));
  nodes.splice(2, 0, priceBox);
  nodes.splice(3, 0, button('次のカードをスキャン', () => { void startCamera(); }, 'primary'));
  const rules = el('details', '', 'card-rules'); rules.open = result.querySelector<HTMLDetailsElement>('.card-rules')?.open ?? false; rules.append(el('summary', 'カード本文・ルール'));
  const japanese = c.lang === 'ja' ? c : jp;
  rules.append(el('h3', '日本語の印刷情報'), el('p', japanese ? `表示用の日本語情報：${japanese.set.toUpperCase()} #${japanese.collector_number} · ja（価格対象は上の選択版）` : '日本語情報なし。英語Oracleを参照してください。', 'small muted'));
  if (japanese) for (const face of japanese.card_faces ?? [japanese]) rules.append(facePanel(face, true));
  rules.append(el('h3', '英語 Oracle（現在のルール本文）'));
  for (const face of c.card_faces ?? [c]) rules.append(facePanel(face, false));
  nodes.push(rules);
  result.replaceChildren(...nodes);
  if (focused) {
    const replacement = [...result.querySelectorAll<HTMLElement>('select, button, summary')].find(node =>
      focusLabel ? node.getAttribute('aria-label') === focusLabel : focusText !== null && node.tagName === focused.tagName && node.textContent === focusText);
    replacement?.focus({ preventScroll: true });
  }
  window.scrollTo({ top: scrollPosition, behavior: 'instant' });
  mark('result-render');
}
function facePanel(face: Face, japanese: boolean): HTMLElement {
  const box = el('article', '', 'face'); box.append(el('h4', japanese ? face.printed_name ?? face.name : face.name), el('p', `${face.mana_cost ?? ''}　${japanese ? face.printed_type_line ?? face.type_line ?? '' : face.type_line ?? ''}`, 'muted'), el('p', japanese ? face.printed_text ?? '日本語印刷本文なし' : face.oracle_text ?? 'Oracle本文なし', 'rules'));
  return box;
}
mark('shell-ready');
