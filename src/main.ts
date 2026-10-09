import './ui/style.css';
import { el, button, label } from './ui/dom.js';
import { closeIconButton } from './ui/close-button.js';
import { Repository, FxProvider } from './data/repository.js';
import type { Card, Face } from './data/cards.js';
import { japaneseName, japaneseDisplay, japaneseFaceName } from './data/japanese-name.js';
import { externalLinks } from './data/external-links.js';
import { ScanHistory } from './ui/scan-history-model.js';
import { ScanHistoryView } from './ui/scan-history.js';
import { FormatLegality } from './ui/format-legality.js';
import { ReferenceImage, referenceFaces, safeScryfallUrl } from './ui/reference-image.js';
import { ResultSession } from './ui/session.js';
import { formatReferencePrice } from './domain/pricing.js';
import { Recognizer, type RecognitionAlternative, type RecognitionResult } from './recognition/adapter.js';
import { LiveCandidate, type Suggestion } from './recognition/live-candidate.js';
import { defaults, bounds, validateSettings, type RecognitionSettings } from './recognition/settings.js';
import { SetBadge } from './ui/set-badge.js';
import { CandidateMetadata } from './ui/candidate-metadata.js';
import { DetectionOverlay } from './ui/detection-overlay.js';
import { captureCameraFrame } from './ui/camera-geometry.js';
import { PrintingsList } from './ui/printings-list.js';
import { alternativeCandidates, type AlternativeCandidate, type CandidateEntry } from './ui/alternative-candidates.js';

const marks: { event: string; ms: number; detail?: unknown }[] = [];
function mark(event: string, detail?: unknown): void { marks.push({ event, ms: performance.now(), detail }); if (marks.length > 300) marks.shift(); performance.clearMarks(event); performance.mark(event); }
mark('shell-start');
// Anonymous page-view counting (Cloudflare Web Analytics) only on the public GitHub Pages
// deployment, never on local dev or the Tailscale preview. No cookies, no cross-site tracking,
// no image/feature data — just that this host rendered a page.
if (location.hostname === 'ikdsk.github.io') {
  const beacon = document.createElement('script');
  beacon.defer = true; beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon', JSON.stringify({ token: '00c24dfbaf044bc4b54872c21eefbc6b' }));
  document.head.append(beacon);
}
const repo = new Repository(); const fx = new FxProvider();
const app = document.querySelector<HTMLDivElement>('#app')!;
const header = el('header'); header.append(el('h1', 'Mana Peek'));
const scan = el('section', '', 'panel scan-panel');
const viewport = el('div', '', 'viewport');
const video = el('video'); video.muted = true; video.playsInline = true; video.autoplay = true;
const guide = el('div', '', 'guide'); guide.append(el('span', 'カードの四隅を画面内に入れてください'));
const overlayCanvas = el('canvas', '', 'detection-overlay'); overlayCanvas.setAttribute('aria-hidden', 'true');
const detectionStatus = el('p', 'カード検出なし', 'small'); detectionStatus.setAttribute('role', 'status');
const overlay = new DetectionOverlay(overlayCanvas, video, visible => { detectionStatus.textContent = visible ? 'カードの四隅を検出 · カード名の確定とは別です' : 'カード検出なし'; });
const cameraIntro = el('div', '', 'camera-intro');
const introHeading = el('h2', '', 'camera-intro-heading');
const introLogo = el('img', '', 'intro-logo'); introLogo.src = `${import.meta.env.BASE_URL}icons/mana-wheel.svg`; introLogo.alt = ''; introLogo.width = 34; introLogo.height = 34; introLogo.decoding = 'async';
introHeading.append(introLogo, el('span', 'Mana Peek'));
cameraIntro.append(introHeading, el('p', 'MTGカードをかざして、日本語情報や参考価格を確認。'), el('p', '結果をタップすると詳細が開きます。残したいカードは「履歴に保存」。', 'small'));
const introPokeca = el('p', '', 'small intro-pokeca'); const introPokecaLink = externalLink('ポケカ版はこちら →'); introPokecaLink.href = 'https://ikdsk.github.io/pokeca-scanner/'; introPokecaLink.id = 'intro-pokeca-link'; introPokeca.append(introPokecaLink); cameraIntro.append(introPokeca);
const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
for (const [name, value] of Object.entries({ viewBox: '0 0 24 28', width: '24', height: '28', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) arrow.setAttribute(name, value);
const arrowPath = document.createElementNS(arrow.namespaceURI, 'path'); arrowPath.setAttribute('d', 'M12 26V4M4 11l8-8 8 8'); arrow.append(arrowPath);
// Points up at the start button; shown exactly when the intro is (camera stopped).
const startHint = el('div', '', 'start-hint'); startHint.append(arrow, el('span', 'タップしてスタート！'));
function showIntro(visible: boolean): void { cameraIntro.hidden = !visible; startHint.hidden = !visible; }
guide.hidden = true; viewport.append(video, overlayCanvas, guide, cameraIntro);
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
footer.append(sources, el('p', 'このアプリと認識コード・モデルはAGPL-3.0でライセンスされています。カードの権利はWizards of the Coast等の権利者に帰属します。', 'small'));
const sister = el('p', '', 'small'); const sisterLink = externalLink('Pokéca Scanner'); sisterLink.href = 'https://ikdsk.github.io/pokeca-scanner/'; sisterLink.id = 'sister-app-link'; sister.append('ポケモンカード版の ', sisterLink, ' もあります'); footer.append(sister);
const notices = el('a', '第三者ライセンスと利用条件'); notices.href = `${import.meta.env.BASE_URL}recognition/THIRD-PARTY-NOTICES.md`; footer.append(notices);
const privacy = el('details'); privacy.append(el('summary', '通信・プライバシーの詳細'), el('p', 'カードIDや検索語をScryfallに、USD/JPYの通貨ペアをFrankfurterに送信します。認識用のコード・モデル・辞書はjsDelivr、Hugging Face、CollectorVisionCatalogから取得します。提供元には通常の通信情報が渡ります。参照画像はScryfallの画像配信元から取得します。撮影・選択画像は保存せず、解析ログはこのタブのメモリ内のみです。公開サイト（ikdsk.github.io）ではCloudflare Web Analyticsによる匿名のページビュー計測のみ行い、Cookie不要・個人を識別する情報は送信しません。画像やカード内容は送信対象外です。'));
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
const actionPanel = el('section', '', 'action-panel'); actionPanel.append(scanActions, startHint);
const tentativePanel = el('aside', '', 'tentative'); tentativePanel.hidden=true; tentativePanel.setAttribute('aria-label','認識候補');
const tentativeEnglish=el('p','','candidate-english');const tentativeExpansion=el('p','','small');const tentativePrice=el('div','','candidate-price');const tentativeFormats=new FormatLegality('candidate-format-disclosure');const tentativeReference=new ReferenceImage();
const tentativeSet=new SetBadge();
const tentativeName=el('strong','','candidate-name'); const tentativeScore=el('span','','small');
const tentativeMessage=el('p','','small');tentativeMessage.setAttribute('role','status'); const announcement=el('span','','sr-only'); announcement.setAttribute('role','status');
const confirm=button('履歴に保存',()=>confirmSuggestion());confirm.setAttribute('aria-label','履歴に保存'); const dismiss=button('他の候補',()=>openAlternatives());
const tentativeContent=el('div'); tentativeContent.append(tentativeName,tentativeEnglish,tentativeSet.node,tentativeScore);
const tentativeActions=el('div','','actions'); tentativeActions.append(confirm,dismiss); const tentativeSummary=el('div','','candidate-summary'); tentativeSummary.append(tentativeReference.node,tentativeContent);
const tentativeDetails=el('div','','candidate-details'); tentativeDetails.id='candidate-details';tentativeDetails.setAttribute('aria-label','候補の詳細');tentativeDetails.setAttribute('role','region');tentativeDetails.tabIndex=0;
const tentativeRules=el('div','','candidate-rules');const tentativeSources=el('div','','candidate-sources');
const tentativePrintings=new PrintingsList(card=>viewPrinting(card));
const tentativeLinks=el('section','','candidate-external-links');tentativeLinks.setAttribute('aria-label','外部リンク');
const wisdomLink=externalLink('Wisdom Guildで見る');const hareruyaLink=externalLink('晴れる屋で見る');
tentativeLinks.append(el('h3','外部リンク'),wisdomLink,hareruyaLink);
// A DOM node lives in one place, so the compact panel gets its own pair, kept in sync by renderExternalLinks().
const compactWisdomLink=externalLink('Wisdom Guild');const compactHareruyaLink=externalLink('晴れる屋');
const compactLinks=el('div','','candidate-compact-links');compactLinks.append(compactWisdomLink,compactHareruyaLink);tentativeSummary.append(compactLinks);
const nameDetails=button('',()=>openCandidateDetail(),'candidate-name-target');nameDetails.setAttribute('aria-label','カード名から詳細を見る');tentativeSummary.append(nameDetails);
const imageDetails=button('',()=>openCandidateDetail(),'candidate-image-target');imageDetails.setAttribute('aria-label','画像から詳細を見る');tentativeSummary.append(imageDetails);
// Detail order: card text first, then physical expansion/status, price sources, other printings.
tentativeSummary.append(tentativePrice,tentativeFormats.node); tentativeDetails.append(tentativeRules,tentativeExpansion,tentativeMessage,tentativeSources,tentativeLinks,tentativePrintings.node);
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
// History reuses the candidate detail sheet, read-only: no scan event, no camera restart.
const historyView = new ScanHistoryView(entry => openStaticCard(entry.card, entry.finish, 'スキャン履歴から表示 · 読み取り専用', '履歴を表示中 · カメラは停止しています', entry.faceIndex), history.limit);
// The camera and dock are the two visual-viewport rows. Auxiliary routes are
// modal overlay windows; the ordinary candidate dock stays nonmodal.
const candidateDock=el('section','','candidate-dock');
const emptyCandidate=el('p','カードをかざすと情報が表示されます。保存は任意です。','empty-candidate small');
const candidateDetail=el('dialog','','candidate-detail-sheet');candidateDetail.id='candidate-detail-sheet';
for(const control of [nameDetails,imageDetails]){control.setAttribute('aria-controls',candidateDetail.id);control.setAttribute('aria-haspopup','dialog');control.setAttribute('aria-expanded','false');}
candidateDetail.setAttribute('aria-label','カードの詳細');candidateDetail.setAttribute('aria-modal','true');
const detailHeader=el('div','','detail-sheet-header');const detailClose=closeIconButton(()=>closeCandidateDetail());detailHeader.append(el('h2','カードの詳細'),detailClose);
const detailBody=el('div','','detail-sheet-body');candidateDetail.append(detailHeader,detailBody);
let detailTrigger:HTMLElement|null=null;
let queuedVerified:{next:Suggestion;card:Card}|null=null;
let savedVersion:number|null=null; let savedCardId:string|null=null;
let feedbackTimer:ReturnType<typeof setTimeout>|null=null;
// A live replacement is held while the sheet or candidate list presents a frozen candidate.
function holdLive():boolean {return candidateDetail.open||(drawer.open&&activeRoute==='alternatives');}
function flushQueued():void {
 const queued=queuedVerified;queuedVerified=null;
 if(queued){const pending=loadingSuggestion;commitSuggestion(queued.next,queued.card);loadingSuggestion=pending;}
}
function openCandidateDetail():void {
 if(!shown||candidateDetail.open)return;
 for(const control of [nameDetails,imageDetails])control.setAttribute('aria-expanded','true');
 detailTrigger=document.activeElement as HTMLElement;nameDetails.hidden=true;imageDetails.hidden=true;detailBody.append(tentativePanel);tentativePanel.hidden=false;tentativeDetails.hidden=false;candidateDetail.showModal();scan.inert=true;candidateDock.inert=true;detailClose.focus({preventScroll:true});
}
function closeCandidateDetail():void {
 if(!candidateDetail.open)return;
 for(const control of [nameDetails,imageDetails])control.setAttribute('aria-expanded','false');
 candidateDetail.close();nameDetails.hidden=false;imageDetails.hidden=false;tentativeDetails.hidden=true;candidateDock.insertBefore(tentativePanel,navigation);scan.inert=false;candidateDock.inert=false;
 // A history/search view owns no live suggestion: leave nothing behind in the dock.
 if(staticView){staticView=false;hideSuggestion();}
 flushQueued();
 if(detailTrigger?.isConnected)detailTrigger.focus({preventScroll:true});detailTrigger=null;
}
candidateDetail.addEventListener('cancel',event=>{event.preventDefault();closeCandidateDetail();});
candidateDetail.addEventListener('keydown',event=>{
 if(event.key!=='Tab')return;
 const controls=[...candidateDetail.querySelectorAll<HTMLElement>('button,a[href],[tabindex]')].filter(n=>n.tabIndex>=0&&!n.matches(':disabled')&&n.checkVisibility({visibilityProperty:true}));
 const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
});
let swipe:{id:number;x:number;y:number}|null=null;
detailHeader.addEventListener('pointerdown',event=>{if((event.target as Element).closest('button')||!event.isPrimary)return;swipe={id:event.pointerId,x:event.clientX,y:event.clientY};detailHeader.setPointerCapture(event.pointerId);});
detailHeader.addEventListener('pointerup',event=>{const start=swipe;swipe=null;if(start?.id===event.pointerId&&event.clientY-start.y>=60&&Math.abs(event.clientX-start.x)<Math.abs(event.clientY-start.y))closeCandidateDetail();});
detailHeader.addEventListener('pointercancel',()=>{swipe=null;});
const navigation=el('nav','','panel-navigation'); navigation.setAttribute('aria-label','スキャナーの機能');
const drawer=el('dialog','','utility-drawer'); drawer.setAttribute('aria-modal','true'); drawer.setAttribute('aria-label','スキャナーの補助画面');
const drawerHeading=el('h2'); drawerHeading.id='drawer-heading';drawer.setAttribute('aria-labelledby',drawerHeading.id);
const drawerBar=el('div','','drawer-bar');const drawerClose=closeIconButton(()=>closeDrawer());drawerBar.append(drawerHeading,drawerClose);
const drawerBody=el('div','','drawer-body');const historyRoute=el('div');historyRoute.append(el('p','確定したスキャンはまだありません。','empty-history'),historyView.node);
const settingsRoute=el('div');settingsRoute.append(settingsPanel,information);
searchPanel.append(fileLabel);
// 他の候補: frozen list of the candidates the user can choose between (see openAlternatives).
const alternativesRoute=el('div'); const alternativesList=el('ol','','alternative-list');
const alternativesStatus=el('p','他の候補を確認中…','small muted');alternativesStatus.setAttribute('role','status');alternativesStatus.hidden=true;
const alternativesSearch=button('見つからない場合は名前検索',()=>searchFromAlternatives());
alternativesRoute.append(el('p','類似度の近い候補です。見つからない場合は名前で検索できます。','small muted'),alternativesList,alternativesStatus,alternativesSearch);
const routes={search:searchPanel,history:historyRoute,settings:settingsRoute,alternatives:alternativesRoute};
const routeNames={search:'名前検索',history:'履歴',settings:'設定',alternatives:'他の候補'};
let activeRoute:keyof typeof routes|null=null;
let drawerTrigger:HTMLElement|null=null;
for(const route of Object.keys(routes) as (keyof typeof routes)[]) {
 if(route==='search'||route==='history'){const control=button(routeNames[route],()=>showDrawer(route));control.setAttribute('aria-controls','utility-drawer');control.setAttribute('aria-expanded','false');control.dataset.route=route;navigation.append(control);}
 routes[route].classList.add('drawer-route');routes[route].dataset.route=route;drawerBody.append(routes[route]);
}
drawer.id='utility-drawer';drawer.append(drawerBar,drawerBody);
candidateDock.append(emptyCandidate,tentativePanel,navigation);
viewport.append(header,actionPanel,cameraInfo);scan.replaceChildren(viewport);app.append(scan,candidateDock,drawer,candidateDetail);
tentativeDetails.hidden=true;
function showDrawer(route:keyof typeof routes):void {
 closeCandidateDetail();
 if(!drawer.open)drawerTrigger=document.activeElement as HTMLElement;
 drawerHeading.textContent=routeNames[route];
 for(const [key,node] of Object.entries(routes))node.classList.toggle('route-active',key===route);
 for(const control of navigation.querySelectorAll<HTMLButtonElement>('button'))control.setAttribute('aria-expanded',String(control.dataset.route===route));
 historyRoute.querySelector<HTMLElement>('.empty-history')!.hidden=history.allEntries.length>0;information.open=route==='settings';drawerBody.scrollTop=0;
 activeRoute=route;
 if(!drawer.open){drawer.showModal();scan.inert=true;candidateDock.inert=true;}
 drawerClose.focus({preventScroll:true});
}
function closeDrawer(keepQueued=false):void {
 if(!drawer.open)return;
 const wasAlternatives=activeRoute==='alternatives';activeRoute=null;
 drawer.close();scan.inert=false;candidateDock.inert=false;
 for(const control of navigation.querySelectorAll('button'))control.setAttribute('aria-expanded','false');
 if(drawerTrigger?.isConnected&&!drawerTrigger.closest('[inert]'))drawerTrigger.focus({preventScroll:true});
 drawerTrigger=null;
 if(wasAlternatives&&!keepQueued)flushQueued();
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
function fitViewport():void {const visual=window.visualViewport;const height=visual?.height??window.innerHeight;app.classList.toggle('compact-viewport',height<=550);app.classList.toggle('short-viewport',height<=400);app.style.height=`${visual?.height??window.innerHeight}px`;app.style.top=`${visual?.offsetTop??0}px`;app.style.left=`${visual?.offsetLeft??0}px`;app.style.width=`${visual?.width??window.innerWidth}px`;candidateDetail.style.setProperty('--window-height',`${height}px`);candidateDetail.style.setProperty('--window-width',`${visual?.width??window.innerWidth}px`);candidateDetail.style.setProperty('--window-top',`${visual?.offsetTop??0}px`);candidateDetail.style.setProperty('--window-left',`${visual?.offsetLeft??0}px`);drawer.style.setProperty('--window-height',`${height}px`);drawer.style.setProperty('--window-width',`${visual?.width??window.innerWidth}px`);drawer.style.setProperty('--window-top',`${visual?.offsetTop??0}px`);drawer.style.setProperty('--window-left',`${visual?.offsetLeft??0}px`);if(drawer.open)requestAnimationFrame(revealDrawerFocus);}
fitViewport();window.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('resize',fitViewport);window.visualViewport?.addEventListener('scroll',fitViewport);

let stream: MediaStream | null = null; let scanGeneration = 0; let active = false; let modelReady = false;
let preparationGeneration = 0;
let preparation: Promise<boolean> | null = null;
let frameBusy = false; let loopTimer: ReturnType<typeof setTimeout> | null = null;
let searchGeneration = 0; let searchRequest: AbortController | null = null; let nextPage: string | null = null;
const tentative = new LiveCandidate();
// Separate request queues keep a slow confirmed printing list from blocking the
// next proposal. Repository instances still share the provider rate scheduler.
const candidateRepo = new Repository();
const snapshots = new CandidateMetadata((id:string,signal:AbortSignal)=>candidateRepo.card(id,signal));
// A frozen display's Japanese lookup must not block verification of live B.
const candidateJapaneseRepo=new Repository();
const japaneseSnapshots=new CandidateMetadata((oracle:string,signal:AbortSignal)=>candidateJapaneseRepo.printings(oracle,signal));
const candidateFx=new CandidateMetadata((_key:string,signal:AbortSignal)=>fx.latest(signal));
// Own cache for 他の候補 entries so a newer live proposal cannot abort their requests.
const alternativeSnapshots=new CandidateMetadata((id:string,signal:AbortSignal)=>candidateRepo.card(id,signal));
const candidateSession=new ResultSession((id)=>snapshots.get(id),()=>candidateFx.get('USDJPY'),renderCandidatePrice);
let loadingSuggestion: Suggestion | null=null;
let suggestion: Suggestion | null=null; let suggestionCard: Card | null=null;
// The physical card currently rendered in the panel. It is the recognized card until the
// reader taps another printing; history/search views (staticView) have no suggestion.
let shown: {card:Card;finish:string} | null=null; let shownJapanese: Card | null=null; let printings: Card[]=[];
let staticView=false; let viewRevision=0;
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
function hideSuggestion():void {if(holdLive())return;queuedVerified=null;loadingSuggestion=null;viewRevision++;tentativeSet.clear();snapshots.cancelExcept(null);alternativeSnapshots.cancelExcept(null);liveAlternatives=null;japaneseSnapshots.cancelExcept(null);suggestion=null;suggestionCard=null;shown=null;shownJapanese=null;printings=[];staticView=false;candidateSession.reset();tentativeReference.clear();tentativeReference.node.remove();tentativeFormats.clear();tentativeFormats.node.remove();tentativePrintings.clear();tentativeActions.hidden=false;tentativeScore.hidden=false;tentativePrice.classList.remove("price-box");tentativePanel.hidden=true;emptyCandidate.hidden=false;emptyCandidate.textContent='カードをかざすと情報が表示されます。保存は任意です。';showIntro(!active);}
function applySettings(next: RecognitionSettings):void {
 settings={...next};evidenceRevision++;
 tentative.reset(settings.tentativeScore,settings.rearmCount,settings.rearmMs);hideSuggestion();overlay.clear();overlay.staleMs=settings.overlayMs;
 for(const [key,input] of settingsInputs)input.value=String(settings[key]);settingsError.textContent='設定を適用しました。新しい観測から使用します。';diagnostics.textContent='類似度 — · margin —';
}
// A candidate is shown only once Scryfall returned exactly that card with a real name.
function verifiedCard(card:Card,id:string):boolean {const name=card.name.trim();return card.id===id&&!!name&&name!==card.id&&name!==card.oracle_id;}
// The newest frame's runner-up identities for the live candidate; metadata is fetched only on demand.
let liveAlternatives:{version:number;items:RecognitionAlternative[]}|null=null;
function observeCandidate(candidate:RecognitionResult):Suggestion|null {
 const next=tentative.observe({...candidate,oracleId:candidate.scryfallOracleId},performance.now());
 if(next&&next.cardId===candidate.cardId)liveAlternatives={version:next.version,items:candidate.alternatives};
 return next;
}
function presentSuggestion(next: Suggestion | null):void {
 if(!next){if(savedVersion!==suggestion?.version)hideSuggestion();return;}
 if(suggestion?.version===next.version){tentativeScore.textContent=`類似度 ${next.score.toFixed(3)}`;return;}
 if(loadingSuggestion?.version===next.version||queuedVerified?.next.version===next.version)return;
 loadingSuggestion=next;snapshots.cancelExcept(next.cardId);
 if(!suggestion){emptyCandidate.hidden=false;emptyCandidate.textContent='カード情報を確認中…';}
 void snapshots.get(next.cardId).then(card=>{
  if(loadingSuggestion?.version!==next.version || !tentative.current(next))return;
  if(!verifiedCard(card,next.cardId)){if(!suggestion)emptyCandidate.textContent='カード情報を確認できません。名前検索を利用してください。';return;}
  if(holdLive()){queuedVerified={next,card};loadingSuggestion=null;return;}
  commitSuggestion(next,card);
 }).catch(()=>{if(loadingSuggestion?.version===next.version&&!suggestion&&tentative.current(next)){emptyCandidate.textContent='カード情報を取得できません。名前検索を利用してください。';}});
}
function commitSuggestion(next:Suggestion,card:Card):void {
  // Commit the verified physical snapshot and its UI together; A stays usable until here.
  savedVersion=null;savedCardId=null;suggestion=next;suggestionCard=card;loadingSuggestion=null;staticView=false;tentativeActions.hidden=false;tentativeScore.hidden=false;
  tentativeReference.clear();tentativeFormats.clear();
  tentativeSummary.prepend(tentativeReference.node);tentativeSummary.append(tentativeFormats.node);tentativePrice.classList.add('price-box');
  tentativeScore.textContent=`類似度 ${next.score.toFixed(3)}`;
  tentativePanel.hidden=false;emptyCandidate.hidden=true;if(performance.now()-lastAnnouncement>=2000){announcement.textContent='候補を確認できます';lastAnnouncement=performance.now();}
  showIntro(false);showCard(card,next.faceIndex);
}
// Render one physical printing into the panel. Shared by live candidates, printing taps
// and history/search views; each call supersedes earlier ones (viewRevision).
function showCard(card:Card,faceIndex?:number,preferredFinish?:string):void {
  const revision=++viewRevision;
  const finish=preferredFinish&&card.finishes.includes(preferredFinish)?preferredFinish:card.finishes.includes('nonfoil')?'nonfoil':card.finishes[0]??'nonfoil';
  shown={card,finish};japaneseSnapshots.cancelExcept(card.oracle_id);candidateSession.reset();tentativeSources.replaceChildren();tentativePrice.replaceChildren();
  if(!staticView){const saved=suggestion!==null&&savedVersion===suggestion.version&&savedCardId===card.id;confirm.textContent=saved?'保存しました ✓':'履歴に保存';tentativeMessage.textContent=saved?'保存しました ✓':'実物の版・言語・加工は未確認';}
  shownJapanese=japaneseDisplay(card,[]);renderExternalLinks(card,shownJapanese);
  tentativeName.textContent=japaneseName(card)??'確認中…';tentativeEnglish.textContent=card.name;
  tentativeSet.update(card);
  tentativeExpansion.textContent=`${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number} · ${card.lang} · ${finish}`;
  tentativeReference.update(card,faceIndex);tentativeFormats.update(card.id,card.legalities);renderCandidateRules(card,card.lang==='ja'?card:null);
  void candidateSession.select(card,finish);
  // Same Oracle card: keep the rendered list (and the tapped thumbnail's focus), move the marker.
  if(printings[0]?.oracle_id===card.oracle_id){tentativePrintings.setCurrent(card.id);applyJapanese(card,printings);return;}
  printings=[];tentativePrintings.loading();
  void japaneseSnapshots.get(card.oracle_id).then(cards=>{
   if(revision!==viewRevision)return;
   printings=cards.some(x=>x.id===card.id)?cards:[card,...cards];tentativePrintings.update(printings,card.id);applyJapanese(card,printings);
  }).catch(()=>{if(revision!==viewRevision)return;tentativePrintings.fail();if(!japaneseName(card))tentativeName.textContent='日本語名は利用できません';});
}
// Plain links opened by the user's click; hrefs are only (re)computed here, never fetched.
function externalLink(text:string):HTMLAnchorElement {const a=el('a',text,'external-link');a.target='_blank';a.rel='noopener noreferrer';return a;}
function renderExternalLinks(card:Card,japanese:Card|null):void {const links=externalLinks(card,japanese);wisdomLink.href=compactWisdomLink.href=links.wisdomGuild;hareruyaLink.href=compactHareruyaLink.href=links.hareruya;}
function applyJapanese(card:Card,cards:Card[]):void {
 if(japaneseName(card))return;
 const japanese=japaneseDisplay(card,cards);shownJapanese=japanese;renderExternalLinks(card,japanese);
 tentativeName.textContent=japanese ? japaneseName(japanese)! : '日本語名は利用できません';renderCandidateRules(card,japanese??null);
}
// Tapping a printing thumbnail switches the displayed version (read-only browse).
function viewPrinting(card:Card):void {
 if(!shown||card.id===shown.card.id)return;
 showCard(card,card.id===suggestion?.cardId?suggestion.faceIndex:undefined);
}
// History and name-search results: the candidate sheet without live suggestion or save.
function openStaticCard(card:Card,finish:string|undefined,origin:string,cameraMessage:string,faceIndex?:number):void {
 stopCamera(cameraMessage);closeDrawer();
 staticView=true;tentativeActions.hidden=true;tentativeScore.hidden=true;
 tentativeReference.clear();tentativeFormats.clear();
 tentativeSummary.prepend(tentativeReference.node);tentativeSummary.append(tentativeFormats.node);tentativePrice.classList.add('price-box');
 tentativePanel.hidden=false;showCard(card,faceIndex,finish);tentativeMessage.textContent=origin;
 openCandidateDetail();
}
function renderCandidateRules(card:Card,japanese:Card|null):void {
 const nodes:HTMLElement[]=[el('h3','日本語の印刷情報')];
 if(japanese){nodes.push(el('p',`表示用：${japanese.set.toUpperCase()} #${japanese.collector_number} · ja（実物・価格対象は候補の版）`,'small muted'));for(const face of japanese.card_faces??[japanese])nodes.push(facePanel(face,true));}
 else nodes.push(el('p','日本語印刷本文は利用できません。英語Oracleを参照してください。','small muted'));
 nodes.push(el('h3','英語 Oracle（現在のルール本文）'));for(const face of card.card_faces??[card])nodes.push(facePanel(face,false));tentativeRules.replaceChildren(...nodes);
}
function renderCandidatePrice():void {
 const value=candidateSession.value;const card=value.card;
 if(!card||card.id!==shown?.card.id){tentativePrice.replaceChildren();tentativeSources.replaceChildren();return;}
 const display=formatReferencePrice(value.quote,value.fx);
 const nodes:HTMLElement[]=[el('p','海外参考価格','eyebrow'),el('strong',value.loading?'価格を取得中…':value.error?'価格を取得できません':display.usd?display.jpy?`参考価格 ${display.jpy}`:'概算JPYは利用できません':'この版・言語・加工の価格なし','price')];
 if(display.usd&&!value.loading&&!value.error)nodes.push(el('span',`${display.usd} USD`,'usd'));
 nodes.push(el('p','国内販売・買取価格ではありません','small'));
 if(value.retrievedAt)nodes.push(el('p',`Scryfall · 応答確認 ${new Date(value.retrievedAt).toLocaleString('ja-JP')} · 価格更新時刻は未取得（24時間キャッシュ）`,'small muted'));
 nodes.push(el('p',value.fx?`Frankfurter / ECB · 1 USD = ${value.fx.jpyPerUsd} JPY · 最新公表日 ${value.fx.asOf}`:value.fxError?'為替を取得できません。USDのみ表示します。':'為替を確認中（取得できなければUSDのみ）','small muted'));
 tentativePrice.replaceChildren(...nodes.filter((node,index)=>index<2||node.classList.contains('usd')));tentativeSources.replaceChildren(...nodes.filter((node,index)=>index>=2&&!node.classList.contains('usd')));
}
// 他の候補: the list is frozen when opened. The current candidate is listed at once; the
// worker's runner-up identities are fetched from Scryfall only now (one request each, on
// the separate alternative cache) and appear once verified. Unverified ones are never shown.
let alternatives:AlternativeCandidate[]=[];let alternativesFor:Suggestion|null=null;
let alternativeExtras:CandidateEntry[]=[];let alternativesPending=0;let alternativesOpen=0;
function openAlternatives():void {
 const captured=activationSnapshot(dismiss);if(!captured||suggestion?.version!==captured.version||!suggestionCard||staticView)return;
 const currentCard=suggestionCard;const current:CandidateEntry={suggestion:captured,card:currentCard};
 const opened=++alternativesOpen;alternativesFor=captured;alternativeExtras=[];alternatives=alternativeCandidates(current);
 const items=liveAlternatives?.version===captured.version?liveAlternatives.items:[];
 const wanted=items.filter(item=>item.cardId!==captured.cardId&&(item.secondaryId??item.cardId)!==captured.identity);
 alternativesPending=wanted.length;
 renderAlternatives();showDrawer('alternatives');
 for(const item of wanted) {
  const identity=item.secondaryId??item.cardId;
  void alternativeSnapshots.get(item.cardId).then(card=>{
   if(opened!==alternativesOpen||alternativesFor?.version!==captured.version||!verifiedCard(card,item.cardId))return;
   alternativeExtras.push({suggestion:{cardId:item.cardId,identity,version:0,faceIndex:item.faceIndex,score:item.score},card});
   alternatives=alternativeCandidates(current,alternativeExtras);
  }).catch(()=>{}).finally(()=>{
   if(opened!==alternativesOpen||alternativesFor?.version!==captured.version)return;
   alternativesPending--;renderAlternatives();
  });
 }
}
function recognizedJapanese():Card|null {return shown?.card.id===suggestionCard?.id?shownJapanese:japaneseDisplay(suggestionCard!,printings);}
function renderAlternatives():void {
 alternativesStatus.hidden=alternativesPending<=0;
 alternativesList.replaceChildren(...alternatives.map(entry=>{
  const item=el('li');const control=button('',()=>chooseAlternative(entry),'alternative-item');
  const japanese=entry.cardId===suggestionCard?.id?recognizedJapanese():entry.card;
  const url=safeScryfallUrl(entry.card.image_uris?.small,'image')??referenceFaces(entry.card)[0]?.url;
  if(url){const image=el('img');image.alt='';image.width=48;image.height=67;image.decoding='async';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();image.src=url;control.append(image);}
  const text=el('span','','alternative-text');text.append(el('strong',(japanese?japaneseName(japanese):null)??entry.card.name),el('span',entry.card.name,'small muted'),el('span',`${entry.card.set_name} (${entry.card.set.toUpperCase()}) #${entry.card.collector_number} · ${entry.card.lang}`,'small'),el('span',`類似度 ${entry.score.toFixed(3)}${entry.current?' · 現在の候補':''}`,'small muted'));
  control.append(text);item.append(control);return item;
 }));
}
function chooseAlternative(entry:AlternativeCandidate):void {
 const captured=alternativesFor;
 closeDrawer(true);
 if(entry.current){openCandidateDetail();return;}
 if(!captured||suggestion?.version!==captured.version)return;
 // The reader's choice replaces the live candidate. The old card is dismissed so its
 // camera frames cannot swap it back; a different card or an absence re-arms it.
 queuedVerified=null;loadingSuggestion=null;tentative.dismiss(captured);
 const next=tentative.adopt({cardId:entry.cardId,identity:entry.identity,faceIndex:entry.faceIndex,score:entry.score});
 commitSuggestion(next,entry.card);openCandidateDetail();
}
function searchFromAlternatives():void {
 const captured=alternativesFor;if(!captured)return;
 if(suggestion?.version===captured.version){tentative.dismiss(captured);tentative.reset();}
 activeRoute=null;alternatives=[];alternativeExtras=[];alternativesFor=null;alternativesList.replaceChildren();
 const japanese=recognizedJapanese();const name=(japanese?japaneseName(japanese):null)??suggestionCard?.name??'';
 closeCandidateDetail();hideSuggestion();query.value=name;showDrawer('search');query.focus({preventScroll:true});
}
function confirmSuggestion():void {
 const captured=activationSnapshot(confirm);
 if(!captured || suggestion?.version!==captured.version)return;
 const view=shown;if(!view || (view.card.id===captured.cardId && suggestionCard?.id!==captured.cardId)){tentativeMessage.textContent='カード情報を確認できません。取得完了後に再確認してください。';return;}
 const card=view.card;if(savedVersion===captured.version&&savedCardId===card.id)return;
 const displayName=shownJapanese ? japaneseName(shownJapanese) : japaneseName(card);
 if(displayName){historyDisplayNames.delete(card.id);historyDisplayNames.set(card.id,displayName);if(historyDisplayNames.size>100)historyDisplayNames.delete(historyDisplayNames.keys().next().value!);}
 savedVersion=captured.version;savedCardId=card.id;
 // Preserve a newer pending B while suppressing the saved stationary A.
 tentative.accepted(captured.identity,true);
 confirm.textContent='保存しました ✓';tentativeMessage.textContent='保存しました ✓';announcement.textContent='保存しました ✓';
 if(feedbackTimer)clearTimeout(feedbackTimer);
 feedbackTimer=setTimeout(()=>{if(savedVersion===captured.version&&savedCardId===card.id){confirm.textContent='履歴に保存';tentativeMessage.textContent='実物の版・言語・加工は未確認';}},1800);
 const event=++acceptedEvent;
 history.accept(event,card,view.finish,card.id===captured.cardId?captured.faceIndex:undefined);historyView.update(history.allEntries,historyDisplayNames);
}
let acceptedEvent = 0;
const recognizer = new Recognizer(message => { modelStatus.textContent = message; });

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
  closeCandidateDetail();if(drawer.open&&activeRoute==='alternatives')closeDrawer(true);scanGeneration++; evidenceRevision++; hideSuggestion(); tentative.newContext();for(const gesture of gestures.values())gesture.snapshot=null; active = false; showIntro(true); overlay.stop(); overlayCanvas.dataset.detected = 'false'; detectionStatus.textContent = 'カード検出なし';
  if (loopTimer) clearTimeout(loopTimer); loopTimer = null;
  stream?.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null;
  scanLabel.textContent = 'スキャン開始'; guide.hidden = true;
  if (message) cameraStatus.textContent = message;
  mark('camera-stop');
}
async function startCamera(): Promise<void> {
  if (active) return;
  closeDrawer();
  stopCamera(); const generation = scanGeneration; active = true; showIntro(false); scanLabel.textContent = '停止';
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
    cameraStatus.textContent = 'カード全体を画面内へ · 情報を表示します。保存は任意です';
    presentSuggestion(observeCandidate(candidate));
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
    const proposal = observeCandidate(candidate);
    presentSuggestion(proposal);
    cameraStatus.textContent = proposal ? '画像の処理が完了しました。情報を確認できます。保存は任意です。' : '候補を絞れませんでした。四隅・背景・反射を確認するか、名前検索で探してください。';
  } catch (error) { if (generation === scanGeneration) cameraStatus.textContent = errorText(error, '画像を認識できません。'); }
}
// A read-only history/search sheet has no camera to release; leave it open.
document.addEventListener('visibilitychange', () => { if (document.hidden && !staticView) stopCamera('背景に移動したため停止しました。スキャン開始から再開できます。'); });
window.addEventListener('pagehide', () => { stopCamera(); invalidatePreparation(); });
window.addEventListener('offline', () => { searchStatus.textContent = 'オフラインです。接続後に検索を再試行してください。'; });
void prepare();

searchForm.addEventListener('submit', event => { event.preventDefault(); void search(); });
async function search(): Promise<void> {
  const term = query.value.trim(); if (!term) return;
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
    const b = button(`${japaneseName(c) ?? c.name}　${c.set.toUpperCase()} #${c.collector_number} · ${c.lang}`, () => openStaticCard(c, undefined, '名前検索から表示 · 読み取り専用', 'カメラは停止中 · カード情報を表示しています'));
    searchResults.append(b);
  }
}
function facePanel(face: Face, japanese: boolean): HTMLElement {
  const box = el('article', '', 'face'); box.append(el('h4', japanese ? japaneseFaceName(face) ?? '日本語名は利用できません' : face.name), el('p', `${face.mana_cost ?? ''}　${japanese ? face.printed_type_line ?? face.type_line ?? '' : face.type_line ?? ''}`, 'muted'), el('p', japanese ? face.printed_text ?? '日本語印刷本文なし' : face.oracle_text ?? 'Oracle本文なし', 'rules'));
  return box;
}
mark('shell-ready');
