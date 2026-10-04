import './ui/style.css';
import { el, button, label } from './ui/dom.js';
import { Repository, FxProvider } from './data/repository.js';
import type { Card, Face } from './data/cards.js';
import { japaneseName, japaneseDisplay, japaneseFaceName } from './data/japanese-name.js';
import { ScanHistory } from './ui/scan-history-model.js';
import { ScanHistoryView } from './ui/scan-history.js';
import { FormatLegality } from './ui/format-legality.js';
import { ReferenceImage } from './ui/reference-image.js';
import { ResultSession } from './ui/session.js';
import { formatReferencePrice } from './domain/pricing.js';
import { Recognizer } from './recognition/adapter.js';
import { LiveCandidate, type Suggestion } from './recognition/live-candidate.js';
import { defaults, bounds, validateSettings, type RecognitionSettings } from './recognition/settings.js';
import { SetBadge } from './ui/set-badge.js';
import { CandidateMetadata } from './ui/candidate-metadata.js';
import { DetectionOverlay } from './ui/detection-overlay.js';
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
const overlayCanvas = el('canvas', '', 'detection-overlay'); overlayCanvas.setAttribute('aria-hidden', 'true');
const detectionStatus = el('p', 'カード検出なし', 'small'); detectionStatus.setAttribute('role', 'status');
const overlay = new DetectionOverlay(overlayCanvas, video, visible => { detectionStatus.textContent = visible ? 'カードの四隅を検出 · カード名の確定とは別です' : 'カード検出なし'; });
guide.hidden = true; viewport.append(video, overlayCanvas, guide);
const cameraStatus = el('p', 'カメラは停止中', 'status camera-status'); cameraStatus.setAttribute('role', 'status');
const modelStatus = el('p', '認識データを準備中', 'muted small'); modelStatus.setAttribute('role', 'status');
const scanActions = el('div', '', 'actions');
const start = button('', () => { if (active) stopCamera('カメラを停止しました'); else void startCamera(); }, 'primary scan-toggle');
const cameraIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) cameraIcon.setAttribute(name, value);
const cameraOutline = document.createElementNS(cameraIcon.namespaceURI, 'path');
cameraOutline.setAttribute('d', 'M3 6h4l2-3h6l2 3h4v15H3Z');
const cameraLens = document.createElementNS(cameraIcon.namespaceURI, 'circle');
cameraLens.setAttribute('cx', '12'); cameraLens.setAttribute('cy', '13'); cameraLens.setAttribute('r', '4');
cameraIcon.append(cameraOutline, cameraLens);
const scanLabel = el('span', 'スキャン開始'); start.append(cameraIcon, scanLabel);
const modelRetry = button('認識の準備を再試行', () => { invalidatePreparation(); const generation = scanGeneration; void prepare().then(ok => { if (ok && active && generation === scanGeneration) void loop(generation); }); }); modelRetry.hidden = true;
const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.id = 'local-image';
const fileLabel = label('端末の画像でスキャン', file); fileLabel.className = 'file-button';
scanActions.append(start, fileLabel, modelRetry);
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
const settingsButton = button('', () => showDrawer('settings'));
settingsButton.setAttribute('aria-label', '情報・設定'); settingsButton.title = '情報・設定';
const gear = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) gear.setAttribute(name, value);
const gearOutline = document.createElementNS(gear.namespaceURI, 'path');
gearOutline.setAttribute('d', 'M9.5 3h5l.5 2.5 2 1.2 2.4-.8 2.5 4.2-1.9 1.7v2.4l1.9 1.7-2.5 4.2-2.4-.8-2 1.2-.5 2.5h-5L9 20.5l-2-1.2-2.4.8-2.5-4.2L4 14.2v-2.4L2.1 10.1l2.5-4.2 2.4.8 2-1.2Z');
const gearHub = document.createElementNS(gear.namespaceURI, 'circle');
gearHub.setAttribute('cx', '12'); gearHub.setAttribute('cy', '13'); gearHub.setAttribute('r', '3');
gear.append(gearOutline, gearHub); settingsButton.append(gear, el('span', '情報・設定', 'sr-only')); header.append(settingsButton);
const actionPanel = el('section', '', 'action-panel'); actionPanel.append(scanActions);
const tentativePanel = el('aside', '', 'tentative'); tentativePanel.hidden=true; tentativePanel.setAttribute('aria-label','もしかして？');
const tentativeEnglish=el('p','','small');const tentativeExpansion=el('p','','small');const tentativePrice=el('div','','candidate-price');const tentativeFormats=new FormatLegality('candidate-format-disclosure');const tentativeReference=new ReferenceImage();
const tentativeSet=new SetBadge();
const tentativeName=el('strong'); const tentativeScore=el('span','','small');
const tentativeMessage=el('p','','small'); const announcement=el('span','','sr-only'); announcement.setAttribute('role','status');
const confirm=button('これです',()=>confirmSuggestion()); const dismiss=button('違う',()=>dismissSuggestion());
const tentativeContent=el('div'); tentativeContent.append(el('span','もしかして？','eyebrow'),tentativeName,tentativeEnglish,tentativeSet.node,tentativeExpansion,tentativeScore,tentativeMessage);
const tentativeActions=el('div','','actions'); tentativeActions.append(confirm,dismiss); const tentativeSummary=el('div','','candidate-summary'); tentativeSummary.append(tentativeReference.node,tentativeContent);
const tentativeDetails=el('div','','candidate-details'); tentativeDetails.id='candidate-details';tentativeDetails.setAttribute('aria-label','候補の詳細');tentativeDetails.setAttribute('role','region');tentativeDetails.tabIndex=0;
const tentativeRules=el('div','','candidate-rules');const tentativeSources=el('div','','candidate-sources');
tentativeSummary.append(tentativePrice); tentativeDetails.append(tentativeExpansion,tentativeMessage,tentativeFormats.node,tentativeSources,tentativeRules);
tentativePanel.append(tentativeSummary,tentativeActions,tentativeDetails,announcement);
const diagnostics=el('p','類似度 — · margin —','small');
const settingsPanel=el('details','','recognition-settings'); settingsPanel.append(el('summary','認識設定（デバッグ）'),el('p','このタブのみ。再読み込みで初期値に戻ります。類似度は未較正の cosine 値で、確率ではありません。','small'));
let settings: RecognitionSettings={...defaults}; let evidenceRevision=0;
const settingsInputs=new Map<keyof RecognitionSettings,HTMLInputElement>();
const settingNames: Record<keyof RecognitionSettings,string>={tentativeScore:'提案の類似度',delayMs:'推論完了後の待ち時間 (ms)',rearmCount:'同じカードの再受付に必要な不在観測数',rearmMs:'不在の最小継続時間 (ms)',overlayMs:'四隅の表示期限 (ms)'};
const settingsError=el('p','','small'); settingsError.setAttribute('role','status');
for(const key of Object.keys(defaults) as (keyof RecognitionSettings)[]) {
 const input=el('input');input.type='number';const [min,max,step]=bounds[key];input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(settings[key]);input.setAttribute('aria-label',settingNames[key]);settingsInputs.set(key,input);
 input.addEventListener('change',()=>{const next={...settings,[key]:input.valueAsNumber};if(!validateSettings(next)){settingsError.textContent='有限の範囲内の値を指定してください。観測数と時間は整数です。';input.value=String(settings[key]);return;}applySettings(next);});
 settingsPanel.append(label(`${settingNames[key]} · 初期値 ${defaults[key]} · ${min}〜${max}`,input));
}
settingsPanel.append(button('認識設定を初期値に戻す',()=>applySettings({...defaults})),settingsError);
const history = new ScanHistory();
const historyDisplayNames=new Map<string,string>();
let currentHistoryGeneration: number | null = null;
const historyView = new ScanHistoryView(entry => {
  stopCamera('履歴を表示中 · カメラは停止しています');
  currentHistoryGeneration = entry.generation;
  void openCard(entry.card, 'スキャン履歴から選択', true, entry.finish);
}, history.limit);
// The camera and dock are the two visual-viewport rows. Auxiliary routes are
// modal overlay windows; the ordinary candidate dock stays nonmodal.
const candidateDock=el('section','','candidate-dock');
const dockToolbar=el('div','','dock-toolbar'); dockToolbar.append(el('span','もしかして？','eyebrow'));
const expand=button('⌃',()=>setExpanded(true)); expand.setAttribute('aria-label','候補パネルを拡大'); expand.setAttribute('aria-controls',tentativeDetails.id);
const contract=button('⌄',()=>setExpanded(false)); contract.setAttribute('aria-label','候補パネルを縮小'); contract.setAttribute('aria-controls',tentativeDetails.id);
dockToolbar.append(expand,contract);
const emptyCandidate=el('p','カードをかざすと候補が表示されます。「これです」で確認してください。','empty-candidate small');
const navigation=el('nav','','panel-navigation'); navigation.setAttribute('aria-label','スキャナーの機能');
const drawer=el('dialog','','utility-drawer'); drawer.setAttribute('aria-modal','true'); drawer.setAttribute('aria-label','スキャナーの補助画面');
const drawerHeading=el('h2'); drawerHeading.id='drawer-heading';drawer.setAttribute('aria-labelledby',drawerHeading.id);
const drawerBar=el('div','','drawer-bar');const drawerClose=button('補助画面を閉じる',()=>closeDrawer());drawerBar.append(drawerHeading,drawerClose);
const drawerBody=el('div','','drawer-body');const historyRoute=el('div');historyRoute.append(el('p','確定したスキャンはまだありません。','empty-history'),historyView.node);
const settingsRoute=el('div');settingsRoute.append(settingsPanel,information);
searchPanel.append(fileLabel);
const routes={search:searchPanel,history:historyRoute,settings:settingsRoute,result};
const routeNames={search:'名前検索',history:'履歴',settings:'設定',result:'確定カード'};
let drawerTrigger:HTMLElement|null=null;
for(const route of Object.keys(routes) as (keyof typeof routes)[]) {
 const control=button(routeNames[route],()=>showDrawer(route));control.setAttribute('aria-controls','utility-drawer');control.setAttribute('aria-expanded','false');control.dataset.route=route;navigation.append(control);
 routes[route].classList.add('drawer-route');routes[route].dataset.route=route;drawerBody.append(routes[route]);
}
drawer.id='utility-drawer';drawer.append(drawerBar,drawerBody);
candidateDock.append(dockToolbar,emptyCandidate,tentativePanel,navigation);
viewport.append(header,actionPanel,cameraInfo);scan.replaceChildren(viewport);app.append(scan,candidateDock,drawer);
function setExpanded(value:boolean):void {candidateDock.dataset.expanded=String(value);expand.disabled=value;contract.disabled=!value;expand.setAttribute('aria-expanded',String(value));contract.setAttribute('aria-expanded',String(value));tentativeDetails.hidden=!value;}
setExpanded(false);
function showDrawer(route:keyof typeof routes):void {
 if(!drawer.open)drawerTrigger=document.activeElement as HTMLElement;
 drawerHeading.textContent=routeNames[route];
 for(const [key,node] of Object.entries(routes))node.classList.toggle('route-active',key===route);
 for(const control of navigation.querySelectorAll<HTMLButtonElement>('button'))control.setAttribute('aria-expanded',String(control.dataset.route===route));
 historyRoute.querySelector<HTMLElement>('.empty-history')!.hidden=history.allEntries.length>0;information.open=route==='settings';drawerBody.scrollTop=0;
 if(!drawer.open){drawer.showModal();scan.inert=true;candidateDock.inert=true;}
 drawerClose.focus({preventScroll:true});
}
function closeDrawer():void {
 if(!drawer.open)return;
 drawer.close();scan.inert=false;candidateDock.inert=false;
 for(const control of navigation.querySelectorAll('button'))control.setAttribute('aria-expanded','false');
 if(drawerTrigger?.isConnected&&!drawerTrigger.closest('[inert]'))drawerTrigger.focus({preventScroll:true});
 drawerTrigger=null;
}
drawer.addEventListener('cancel',event=>{event.preventDefault();closeDrawer();});
function revealDrawerFocus():void {
 const focused=document.activeElement;
 if(!drawer.open||!(focused instanceof HTMLElement)||!drawerBody.contains(focused))return;
 const field=focused.getBoundingClientRect(),body=drawerBody.getBoundingClientRect();
 if(field.bottom>body.bottom-8)drawerBody.scrollTop+=Math.ceil(field.bottom-body.bottom+8);
 else if(field.top<body.top+8)drawerBody.scrollTop-=Math.ceil(body.top-field.top+8);
}

// Keep endpoint Tab navigation in the window, including Chromium's browser-chrome
// tab stop. Native modal behavior supplies the background inertness and Escape.
drawer.addEventListener('keydown',event=>{
 if(event.key!=='Tab')return;
 const controls=[...drawer.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],summary,[tabindex]')].filter(node=>node.tabIndex>=0&&!node.matches(':disabled')&&node.checkVisibility({visibilityProperty:true}));
 const first=controls[0],last=controls.at(-1);if(!first||!last)return;
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus({preventScroll:true});revealDrawerFocus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus({preventScroll:true});}
});

// visualViewport handles browser bars and the software keyboard without page jumps.
function fitViewport():void {const visual=window.visualViewport;const height=visual?.height??window.innerHeight;app.classList.toggle('compact-viewport',height<=550);app.classList.toggle('short-viewport',height<=400);app.style.height=`${visual?.height??window.innerHeight}px`;app.style.top=`${visual?.offsetTop??0}px`;app.style.left=`${visual?.offsetLeft??0}px`;app.style.width=`${visual?.width??window.innerWidth}px`;drawer.style.setProperty('--window-height',`${height}px`);drawer.style.setProperty('--window-width',`${visual?.width??window.innerWidth}px`);drawer.style.setProperty('--window-top',`${visual?.offsetTop??0}px`);drawer.style.setProperty('--window-left',`${visual?.offsetLeft??0}px`);if(drawer.open)requestAnimationFrame(revealDrawerFocus);}
fitViewport();window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);

let stream: MediaStream | null = null; let scanGeneration = 0; let active = false; let modelReady = false;
let preparationGeneration = 0;
let preparation: Promise<boolean> | null = null;
let frameBusy = false; let loopTimer: ReturnType<typeof setTimeout> | null = null;
let detailGeneration = 0; let detailRequest: AbortController | null = null;
let printingCards: Card[] = []; let printStatus = ''; let source = '';
let searchGeneration = 0; let searchRequest: AbortController | null = null; let nextPage: string | null = null;
const tentative = new LiveCandidate();
// Separate request queues keep a slow confirmed printing list from blocking the
// next proposal. Repository instances still share the provider rate scheduler.
const candidateRepo = new Repository();
const snapshots = new CandidateMetadata((id:string,signal:AbortSignal)=>candidateRepo.card(id,signal));
const japaneseSnapshots=new CandidateMetadata((oracle:string,signal:AbortSignal)=>candidateRepo.printings(oracle,signal));
const candidateFx=new CandidateMetadata((_key:string,signal:AbortSignal)=>fx.latest(signal));
const candidateSession=new ResultSession((id)=>snapshots.get(id),()=>candidateFx.get('USDJPY'),renderCandidatePrice);
let loadingSuggestion: Suggestion | null=null;
let suggestion: Suggestion | null=null; let suggestionCard: Card | null=null; let suggestionJapanese: Card | null=null;
let lastAnnouncement=-Infinity;
type ActivationGesture = { snapshot: Suggestion | null; key: string | null };
const gestures = new Map<HTMLButtonElement, ActivationGesture>();
function captureGesture(control: HTMLButtonElement, key: string | null): void {
 gestures.set(control,{snapshot:suggestion ? Object.freeze({...suggestion}) : null,key});
}
function activationSnapshot(control: HTMLButtonElement): Suggestion | null {
 const gesture=gestures.get(control);
 if(!gesture)return suggestion; // Deliberate click / assistive activation without a down event.
 if(gesture.key===null)gestures.delete(control);
 return gesture.snapshot;
}
for(const control of [confirm,dismiss]) {
 control.addEventListener('pointerdown',()=>captureGesture(control,null));
 control.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  event.preventDefault();
  if(event.repeat || gestures.get(control)?.key)return;
  captureGesture(control,event.key);
  if(event.key==='Enter')control.click();
 });
 control.addEventListener('keyup',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  event.preventDefault();
  const gesture=gestures.get(control);
  if(gesture?.key===event.key) {
   if(event.key===' '&&gesture.snapshot)control.click();
   gestures.delete(control);
  }
 });
 const cancel=()=>{const gesture=gestures.get(control);if(gesture){gesture.snapshot=null;gesture.key=null;}};
 control.addEventListener('blur',cancel);control.addEventListener('pointercancel',cancel);
 window.addEventListener('blur',cancel);
 // Release can occur after focus left the button. Never reuse that canceled gesture.
 document.addEventListener('keyup',event=>{if(gestures.get(control)?.key===event.key)gestures.delete(control);});
}
function hideSuggestion():void {loadingSuggestion=null;tentativeSet.clear();snapshots.cancelExcept(null);japaneseSnapshots.cancelExcept(null);suggestion=null;suggestionCard=null;suggestionJapanese=null;candidateSession.reset();tentativeReference.clear();tentativeReference.node.remove();tentativeFormats.clear();tentativeFormats.node.remove();tentativePrice.classList.remove("price-box");tentativePanel.hidden=true;emptyCandidate.hidden=false;emptyCandidate.textContent='カードをかざすと候補が表示されます。「これです」で確認してください。';}
function applySettings(next: RecognitionSettings):void {
 settings={...next};evidenceRevision++;
 tentative.reset(settings.tentativeScore,settings.rearmCount,settings.rearmMs);hideSuggestion();overlay.clear();overlay.staleMs=settings.overlayMs;
 for(const [key,input] of settingsInputs)input.value=String(settings[key]);settingsError.textContent='設定を適用しました。新しい観測から使用します。';diagnostics.textContent='類似度 — · margin —';
}
function presentSuggestion(next: Suggestion | null):void {
 if(!next){hideSuggestion();return;}
 if(suggestion?.version===next.version){tentativeScore.textContent=`類似度 ${next.score.toFixed(3)}`;return;}
 if(loadingSuggestion?.version===next.version)return;
 loadingSuggestion=next;snapshots.cancelExcept(next.cardId);
 if(!suggestion){emptyCandidate.hidden=false;emptyCandidate.textContent='カード情報を確認中…';}
 void snapshots.get(next.cardId).then(card=>{
  if(loadingSuggestion?.version!==next.version || !tentative.current(next))return;
  if(card.id!==next.cardId || !card.name.trim() || card.name.trim()===card.id || card.name.trim()===card.oracle_id){if(!suggestion)emptyCandidate.textContent='カード情報を確認できません。名前検索を利用してください。';return;}
  // Commit the verified physical snapshot and its UI together; A stays usable until here.
  suggestion=next;loadingSuggestion=null;suggestionJapanese=null;japaneseSnapshots.cancelExcept(null);candidateSession.reset();
  tentativeReference.clear();tentativeFormats.clear();tentativePrice.replaceChildren();tentativeSources.replaceChildren();
  tentativeSummary.prepend(tentativeReference.node);tentativeDetails.insertBefore(tentativeFormats.node,tentativeSources);tentativePrice.classList.add('price-box');
  tentativeScore.textContent=`類似度 ${next.score.toFixed(3)}`;
  tentativePanel.hidden=false;emptyCandidate.hidden=true;if(performance.now()-lastAnnouncement>=2000){announcement.textContent='もしかして？ 候補を確認できます';lastAnnouncement=performance.now();}suggestionCard=card;suggestionJapanese=japaneseDisplay(card,[]);tentativeName.textContent=japaneseName(card) ? `日本語：${japaneseName(card)}` : '日本語：確認中…';
  tentativeEnglish.textContent=`英語：${card.name}`;const finish=card.finishes.includes('nonfoil')?'nonfoil':card.finishes[0]??'nonfoil';
  tentativeSet.update(card);
  tentativeExpansion.textContent=`${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number} · ${card.lang} · ${finish}`;
  tentativeMessage.textContent='実物の版・言語・加工は未確認';tentativeReference.update(card,next.faceIndex);tentativeFormats.update(card.id,card.legalities);renderCandidateRules(card,card.lang==='ja'?card:null);
  void candidateSession.select(card,finish);
  if(japaneseName(card))return;
  void japaneseSnapshots.get(card.oracle_id).then(cards=>{
   if(suggestion?.version!==next.version)return;
   const japanese=japaneseDisplay(card,cards);suggestionJapanese=japanese;
   tentativeName.textContent=japanese ? `日本語：${japaneseName(japanese)}` : '日本語名は利用できません';renderCandidateRules(card,japanese??null);
  }).catch(()=>{if(suggestion?.version===next.version)tentativeName.textContent='日本語名は利用できません';});
 }).catch(()=>{if(loadingSuggestion?.version===next.version&&!suggestion&&tentative.current(next)){emptyCandidate.textContent='カード情報を取得できません。名前検索を利用してください。';}});
}
function renderCandidateRules(card:Card,japanese:Card|null):void {
 const nodes:HTMLElement[]=[el('h3','日本語の印刷情報')];
 if(japanese){nodes.push(el('p',`表示用：${japanese.set.toUpperCase()} #${japanese.collector_number} · ja（実物・価格対象は候補の版）`,'small muted'));for(const face of japanese.card_faces??[japanese])nodes.push(facePanel(face,true));}
 else nodes.push(el('p','日本語印刷本文は利用できません。英語Oracleを参照してください。','small muted'));
 nodes.push(el('h3','英語 Oracle（現在のルール本文）'));for(const face of card.card_faces??[card])nodes.push(facePanel(face,false));tentativeRules.replaceChildren(...nodes);
}
function renderCandidatePrice():void {
 const value=candidateSession.value;const card=value.card;
 if(!card||card.id!==suggestion?.cardId){tentativePrice.replaceChildren();tentativeSources.replaceChildren();return;}
 const display=formatReferencePrice(value.quote,value.fx);
 const nodes:HTMLElement[]=[el('p','海外参考価格','eyebrow'),el('strong',value.loading?'価格を取得中…':value.error?'価格を取得できません':display.usd?display.jpy?`概算 ${display.jpy}`:'概算JPYは利用できません':'この版・言語・加工の価格なし','price')];
 if(display.usd&&!value.loading&&!value.error)nodes.push(el('span',`${display.usd} USD`,'usd'));
 nodes.push(el('p','国内販売・買取価格ではありません','small'));
 if(value.retrievedAt)nodes.push(el('p',`Scryfall · 応答確認 ${new Date(value.retrievedAt).toLocaleString('ja-JP')} · 価格更新時刻は未取得（24時間キャッシュ）`,'small muted'));
 nodes.push(el('p',value.fx?`Frankfurter / ECB · 1 USD = ${value.fx.jpyPerUsd} JPY · 最新公表日 ${value.fx.asOf}`:value.fxError?'為替を取得できません。USDのみ表示します。':'為替を確認中（取得できなければUSDのみ）','small muted'));
 tentativePrice.replaceChildren(...nodes.filter((node,index)=>index<2||node.classList.contains('usd')));tentativeSources.replaceChildren(...nodes.filter((node,index)=>index>=2&&!node.classList.contains('usd')));
}
function dismissSuggestion():void {const captured=activationSnapshot(dismiss);if(captured&&suggestion?.version===captured.version){tentative.dismiss(captured);tentative.reset();hideSuggestion();}}
function confirmSuggestion():void {
 const captured=activationSnapshot(confirm);
 if(!captured || suggestion?.version!==captured.version)return;
 const card=suggestionCard;if(!card || card.id!==captured.cardId){tentativeMessage.textContent='カード情報を確認できません。取得完了後に再確認してください。';return;}
 const displayName=suggestionJapanese ? japaneseName(suggestionJapanese) : japaneseName(card);
 if(displayName){historyDisplayNames.delete(card.id);historyDisplayNames.set(card.id,displayName);if(historyDisplayNames.size>100)historyDisplayNames.delete(historyDisplayNames.keys().next().value!);}
 evidenceRevision++;tentative.accepted(captured.identity);hideSuggestion();
 const event=++acceptedEvent;const finish=card.finishes.includes('nonfoil')?'nonfoil':card.finishes[0]??'nonfoil';
 history.accept(event,card,finish);currentHistoryGeneration=event;historyView.update(history.allEntries,historyDisplayNames);
 void openCard(card,'「これです」で確認 · 実物の版・言語・加工は未確認',false,finish,active,captured.faceIndex);
}
let acceptedEvent = 0;
const recognizer = new Recognizer(message => { modelStatus.textContent = message; });
const referenceImage = new ReferenceImage();
const formatLegality = new FormatLegality();
const session = new ResultSession((id, signal) => repo.card(id, signal), signal => fx.latest(signal), renderResult);

function invalidatePreparation(): void {
  preparationGeneration++;
  preparation = null;
  modelReady = false;
  recognizer.dispose();
}
function prepare(): Promise<boolean> {
  if (modelReady) return Promise.resolve(true);
  if (preparation) return preparation;
  const attempt = ++preparationGeneration;
  modelRetry.hidden = true; mark('model-start');
  preparation = (async () => {
    try { await recognizer.init(); if (attempt !== preparationGeneration) return false; modelReady = true; mark('model-ready'); return true; }
    catch (error) { if (attempt !== preparationGeneration) return false; modelReady = false; modelStatus.textContent = errorText(error, '認識データを準備できません。名前検索は利用できます。'); modelRetry.hidden = false; mark('model-error'); return false; }
    finally { if (attempt === preparationGeneration) preparation = null; }
  })();
  return preparation;
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
  scanGeneration++; evidenceRevision++; hideSuggestion(); tentative.newContext();for(const gesture of gestures.values())gesture.snapshot=null; active = false;  overlay.stop(); overlayCanvas.dataset.detected = 'false'; detectionStatus.textContent = 'カード検出なし';
  if (loopTimer) clearTimeout(loopTimer); loopTimer = null;
  stream?.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null;
  scanLabel.textContent = 'スキャン開始'; guide.hidden = true;
  if (message) cameraStatus.textContent = message;
  mark('camera-stop');
}
async function startCamera(): Promise<void> {
  if (active) return;
  closeDrawer();
  currentHistoryGeneration = null;
  detailGeneration++; detailRequest?.abort(); session.reset();
  stopCamera(); const generation = scanGeneration; active = true; scanLabel.textContent = '停止';
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
    overlay.start(); stream = obtained; guide.hidden = false; video.srcObject = stream; await video.play();
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
    const revision=evidenceRevision; mark('frame-start'); const capturedAt = performance.now(); const bitmap = await captureVideo();
    if (generation !== scanGeneration) { bitmap.close(); return; }
    const candidate = await recognizer.frame(bitmap); mark('frame-result', candidate.timing);
    if (generation !== scanGeneration || !active || revision!==evidenceRevision) return;
    diagnostics.textContent=`類似度 ${Number.isFinite(candidate.score) ? candidate.score!.toFixed(3) : '—'} · margin ${Number.isFinite(candidate.margin) ? candidate.margin.toFixed(3) : '—'}`;
    overlay.update(candidate, capturedAt);
    cameraStatus.textContent = 'カード全体を画面内へ · 候補は「これです」で確認してください';
    presentSuggestion(tentative.observe({...candidate,oracleId:candidate.scryfallOracleId},performance.now()));
  } catch (error) {
    if (generation === scanGeneration) { modelReady = false; modelRetry.hidden = false; stopCamera(errorText(error, '認識できません。名前検索も利用できます。')); }
  } finally {
    frameBusy = false;
    if (active && generation === scanGeneration) loopTimer = setTimeout(() => { void loop(generation); }, settings.delayMs);
  }
}
file.addEventListener('change', () => { const image = file.files?.[0]; file.value = ''; if (image) void scanFile(image); });
async function scanFile(image: File): Promise<void> {
  closeDrawer();
  currentHistoryGeneration = null;
  detailGeneration++; detailRequest?.abort(); session.reset();
  // A local image starts a new recognition session; never compete with a
  // transferred camera frame that cannot be recalled from the old worker.
  invalidatePreparation();
  stopCamera(); const generation = scanGeneration;
  cameraStatus.textContent = '端末の画像を認識中（外部送信なし）';
  try {
    if (image.size > 25 * 1024 * 1024) throw new Error('25MB以下の画像を選んでください');
    if (!(await prepare()) || generation !== scanGeneration) return;
    const decoded = await createImageBitmap(image);
    const canvas = document.createElement('canvas'); const scale = Math.min(1, 1024 / Math.max(decoded.width, decoded.height));
    canvas.width = Math.round(decoded.width * scale); canvas.height = Math.round(decoded.height * scale);
    canvas.getContext('2d')!.drawImage(decoded, 0, 0, canvas.width, canvas.height); decoded.close();
    const revision=evidenceRevision; mark('file-frame-start'); const candidate = await recognizer.frame(await createImageBitmap(canvas)); mark('file-frame-result', candidate);
    if (generation !== scanGeneration || revision!==evidenceRevision) return;
    diagnostics.textContent=`類似度 ${Number.isFinite(candidate.score)?candidate.score!.toFixed(3):'—'} · margin ${Number.isFinite(candidate.margin)?candidate.margin.toFixed(3):'—'}`;
    const proposal = tentative.observe({...candidate,oracleId:candidate.scryfallOracleId},performance.now());
    presentSuggestion(proposal);
    cameraStatus.textContent = proposal ? '画像の処理が完了しました。候補が表示されたら「これです」で確認してください。' : '候補を絞れませんでした。四隅・背景・反射を確認するか、名前検索で探してください。';
  } catch (error) { if (generation === scanGeneration) cameraStatus.textContent = errorText(error, '画像を認識できません。'); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera('背景に移動したため停止しました。スキャン開始から再開できます。'); });
window.addEventListener('pagehide', () => { stopCamera(); invalidatePreparation(); });
window.addEventListener('offline', () => { searchStatus.textContent = 'オフラインです。接続後に検索を再試行してください。'; });
void prepare();

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
    const b = button(`${japaneseName(c) ?? c.name}　${c.set.toUpperCase()} #${c.collector_number} · ${c.lang}`, () => { currentHistoryGeneration = null; void openCard(c, '手動検索で選択'); });
    searchResults.append(b);
  }
}
let confirmedFace: {id:string;faceIndex:number} | null=null;
async function openCard(c: Card, origin: string, reveal = true, selectedFinish?: string, live = false, faceIndex?: number): Promise<void> {
  if (!live) stopCamera('カメラは停止中 · カード情報を表示しています'); detailRequest?.abort(); const request = new AbortController(); detailRequest = request; const generation = ++detailGeneration;
  if(faceIndex!==undefined)confirmedFace={id:c.id,faceIndex};else if(confirmedFace?.id!==c.id)confirmedFace=null;
  printingCards = [c]; printStatus = '版・言語の一覧を全ページ取得中…'; source = origin;
  void session.select(c, selectedFinish ?? (c.finishes.includes('nonfoil') ? 'nonfoil' : c.finishes[0] ?? 'nonfoil'));
  result.hidden = false; renderResult();
  if (reveal) showDrawer('result');
  try {
    const cards = await repo.printings(c.oracle_id, request.signal);
    if (generation !== detailGeneration) return;
    printingCards = cards.some(x => x.id === c.id) ? cards : [c, ...cards];
    printStatus = `${printingCards.length}版・言語（全ページ）`; renderResult();
  } catch (error) { if (generation === detailGeneration) { printStatus = errorText(error, '版一覧を取得できません。'); renderResult(); } }
}
function options(select: HTMLSelectElement, entries: [string, string][], selected: string): void {
  for (const [value, name] of entries) { const option = el('option', name); option.value = value; option.selected = value === selected; select.append(option); }
}
function choose(c: Card, finish = session.value.finish): void {
  const available = c.finishes.includes(finish) ? finish : c.finishes[0] ?? 'nonfoil';
  source = '手動指定 · 認識結果で変更されません';
  if (currentHistoryGeneration !== null) { history.update(currentHistoryGeneration, c, available); historyView.update(history.allEntries,historyDisplayNames); }
  void session.select(c, available);
}
function renderResult(): void {
  const value = session.value; const c = value.card; if (!c) { referenceImage.clear(); formatLegality.clear(); result.hidden = true; result.replaceChildren(); return; }
  result.hidden = false; const scrollPosition = drawerBody.scrollTop; const nodes: HTMLElement[] = [];
  const focused = result.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
  const focusLabel = focused?.getAttribute('aria-label');
  const focusText = focused && ['BUTTON', 'SUMMARY'].includes(focused.tagName) ? focused.textContent : null;
  const heading = el('div', '', 'result-heading'); const identity = el('div', '', 'identity');
  identity.append(el('h2', japaneseName(japaneseDisplay(c,printingCards) ?? c) ?? c.name), el('p', c.name, 'muted'), el('p', `${c.set.toUpperCase()} #${c.collector_number} · ${c.lang}`, 'small muted'), el('p', source, 'eyebrow'), button('スキャンに戻る', () => {
    closeDrawer(); start.focus({ preventScroll: true });
  }));
  referenceImage.update(c,confirmedFace?.id===c.id?confirmedFace.faceIndex:undefined); heading.append(referenceImage.node, identity); nodes.push(heading);
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
  if (printStatus.includes('取得できません') || printStatus.includes('失敗')) nodes.push(button('版一覧を再取得', () => { void openCard(c, source, false, value.finish, active); }));
  nodes.push(el('p', `価格の参照対象：${c.set.toUpperCase()} #${c.collector_number} · ${c.lang} · ${finishNames[value.finish] ?? value.finish}`, 'target'));
  const priceBox = el('div', '', 'price-box');
  // Late FX can remove a wrapped status line. Retain the measured price region
  // so even a reader at document bottom keeps their exact position.
  const previousPriceHeight = result.querySelector('.price-box')?.getBoundingClientRect().height;
  if (previousPriceHeight) priceBox.style.minHeight = `${previousPriceHeight}px`;
  const display = formatReferencePrice(value.quote, value.fx);
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
  const japanese = japaneseDisplay(c,printingCards);
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
  drawerBody.scrollTop=scrollPosition;
  mark('result-render');
}
function facePanel(face: Face, japanese: boolean): HTMLElement {
  const box = el('article', '', 'face'); box.append(el('h4', japanese ? japaneseFaceName(face) ?? '日本語名は利用できません' : face.name), el('p', `${face.mana_cost ?? ''}　${japanese ? face.printed_type_line ?? face.type_line ?? '' : face.type_line ?? ''}`, 'muted'), el('p', japanese ? face.printed_text ?? '日本語印刷本文なし' : face.oracle_text ?? 'Oracle本文なし', 'rules'));
  return box;
}
mark('shell-ready');
