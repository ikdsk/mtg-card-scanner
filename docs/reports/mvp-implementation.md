# MVP実装報告 — 2026-10-04

## 判定

**Vite/TypeScriptの実アプリを実装し、型検査・118テスト・production buildはPASS。
実ブラウザ、実モデル、ライブAPIの縦通しは環境制約でBLOCKED。完成・公開合格とは判定しない。**
架空の候補、価格、為替、性能値は使用していない。model failure時も検索経路は独立。
最終の独立TEST/QA、実機性能、公開承認はこの実装担当の自己検査とは別。

- branch: `feat/mvp-end-to-end`
- worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/mvp`
- base: `38a9f58e0b8caf4b15c44fc518db3fce4adac125`
- 候補commit: **未作成**。specific filesの`git add`が共有metadataのindex.lock書込みをEPERMで拒否された。現在HEADは上記baseのまま。変更はこのworktreeに保持。
- 実行環境: macOS、Node v24.2.0、npm 11.3.0、Vite 8.3.2、Vitest 5.0.3、Playwright 1.59.1。
- sole implementation writerとして作業。他エージェントなし、他worktree編集なし。
  root設定/共有契約はこのフェーズの明示的委譲内。push/merge/deployなし。

## 成果物・変更範囲

| パス | 内容 |
|---|---|
| `index.html`, `src/main.ts`, `src/ui/{dom,session,style}.*` | 日本語の軽い画面、カメラ・ガイド・画像入力・検索、情報/価格/版操作、dark/light、ライフサイクル、local debug |
| `src/data/{cards,http,repository}.ts` | 実Scryfall/Frankfurter、入力検証、全ページ、exact ID/finish、間隔/timeout/cache |
| `src/recognition/{manifest,gate,adapter}.ts` | 固定model/catalog、1 in-flight、安定候補、取消・stale排除、Worker接続 |
| `public/recognition/scanner.worker.mjs` | 固定CollectorVisionから派生した実検出/射影補正/embedding/search、WASM CPU、hash検証、local mirror |
| `public/recognition/lib/collectorvision-catalog-v2.mjs` | 固定upstreamの未改変catalog client。圧縮資源hash/size照合、atomic snapshot cache |
| `public/recognition/catalog-feed-v2.json` | MTGだけの固定feed、v50 base＋51/52 deltas、URL/size/hash。埋め込み/画像は含めない |
| `public/recognition/{LICENSE-AGPL-3.0.txt,THIRD-PARTY-NOTICES.md}` | AGPL全文とコード/model/catalog/image/APIごとの条件 |
| `scripts/{prepare-assets,live-evidence}.mjs` | ignored local資源の取得/検証と実browser/model/API証拠の再現runner |
| `tests/unit/{fixtures,cards,session,recognition,adapter,providers}.*` | SYNTHETICの価格/FX/ページ/race/worker取消・frame上限の実装者テスト |
| `tests/browser/smoke.spec.ts`, `playwright.config.ts` | desktop/mobile viewport mock smoke。独立TEST担当のテストとは名乗らない |
| `package*.json`, `tsconfig.json`, `vite.config.ts`, `.github/workflows/ci.yml`, `.gitignore` | Vite/Playwright/CI/ignored assets、起動/build/test commands |
| `README.md`, `docs/contracts.md`, 本報告 | 起動・条件・実測区別・引き渡し |

既存`src/domain/*`、既存4テストファイル（103ケース）、独立TEST/QA資料は変更していない。
test削除、skip、assert緩和、閾値緩和は行っていない。

## 実行したコマンドと結果

| 実コマンド | 実際の結果 |
|---|---|
| 初回 `npm run check` | node_modulesなしでTS2688。これは行動のRED証拠とは数えない |
| `npm ci`; `npm run check` | 導入成功、既存4 files / 103 tests PASS |
| `npm install -D vite@8.3.2 @playwright/test@1.59.1 --offline` | 元cacheは書込み禁止/metadata未解決。設定変更せず一時cacheへコピーして再実行 |
| writable `/tmp/mtg-npm-cache`指定で同じoffline install | 成功。依存version固定、lock更新。global設定/権限変更なし |
| 最終 `npm run check` | 9 files / **118 tests PASS**、型検査PASS（既存103＋追加15） |
| `npm run build` | PASS、15 modules。最終初期JS 25.19kB / gzip 10.21kB、CSS 4.64kB / gzip 1.79kB、HTML 0.44kB。これらは起動時間ではない |
| `node --check public/recognition/scanner.worker.mjs`; `node --check public/recognition/lib/collectorvision-catalog-v2.mjs` | syntax PASS。推論実行の証明ではない |
| `git diff --check` | PASS |
| specific filesを列挙した `git add ...` | `Unable to create .../.git/worktrees/mvp/index.lock: Operation not permitted`。stagingできずcommit未作成。Git設定/metadata場所を変更する迂回は行っていない |
| `npm run dev -- --port 5173` | `listen EPERM 127.0.0.1:5173`でサーバー起動不可 |
| `npm run test:e2e` | 同じEPERMでwebServer起動前に失敗、smoke本体未実行 |
| `PLAYWRIGHT_NO_SERVER=1 PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e` | 待受け不要で実distをrouteから提供する代替を試したが、Chrome launchでSIGABRT、kill EPERM。6ケース全て起動失敗/0ms。UI assertion実行成功ではない |
| `npm run assets:prepare` | 最初の固定Cornelius取得で`fetch failed ENOTFOUND`。モデル/catalogダウンロード成功なし |
| `npm run evidence:live` | 固定公式sample取得で`fetch failed ENOTFOUND`。`artifacts/live/evidence.json`に失敗保存、live結果なし |
| `curl ...api.scryfall.com/cards/named?exact=Lightning%20Bolt` | exit 6、`Could not resolve host: api.scryfall.com` |
| `curl ...api.frankfurter.dev/v2/providers/ecb/rate/USD/JPY` | exit 6、同providerのDNS解決失敗 |

上流ソースは読み取り専用GitHubコネクタで固定refから確認・取得できた。
ブラウザのGitHub APIアクセスは自動承認レビューに拒否された（アクセス許可拒否）。
ブラウザ経由の迂回は行っていない。`web`によるScryfall docsも403、
API URLは取得不可。Frankfurter公式docsは確認できたが、レート取得成功とは区別する。
Sandbox権限、network isolation、global config、credentialsは変更していない。

## 実際のRED→GREEN記録

各行は小さな行動テストを実行して失敗を確認してから修正したもの。
Provider/UIの全実装に対する遡及REDは作っていない。

| 行動/実コマンド | RED実測 | GREEN実測 |
|---|---|---|
| `npx vitest run tests/unit/cards.test.ts` (16:11 JST) | nonfoil 0.00で`null`を返し失敗 | exact finish lookup後1/1 PASS |
| `npx vitest run tests/unit/session.test.ts` (16:12) | select直後loading=false、期待trueで失敗 | 即clear/loading、token＋target照合でPASS |
| `npx vitest run tests/unit/recognition.test.ts` (16:13) | 2連続valid frameでも候補nullで失敗 | score/margin/quality＋2一致gateで1/1 PASS |
| `npx vitest run tests/unit/session.test.ts` (16:16) | 新スキャンreset未実装で失敗 | generation更新・clear・stale破棄でPASS |
| `npx vitest run tests/unit/adapter.test.ts` (16:18) | dispose後init outcomeがpendingのままで失敗 | rejectReadyとcleanupでPASS |
| 同adapter (16:20) | init待ちの2framesを2件とも送信、期待1件で失敗 | init前からleaseを予約、拒否bitmap.close、1件でPASS |
| session (16:21) | card+FX両方失敗でfxError=falseのままで失敗 | card失敗経路もFXをsettle、PASS |
| adapter (16:25) | bitmap転送失敗後worker.terminated=falseで失敗 | frame errorでlease/timer/worker cleanup、3/3 PASS |

追加provider/raceテストは全てSYNTHETICのテスト後検証。全版pagination、
不正next URL、FX date/direction/zero、不正価格応答、429非連打、cache-hit abort、
queue中止、旧成功/旧失敗/ABA/対象不一致を確認。実認識/API適合は証明しない。

## 実経路の設計と固定版

- Camera-first: 明示gestureでgetUserMediaとinitを並行。映像表示と認識readyを
  別status。3:4プレビューのguide＋paddingを切出し、720×1003のImageBitmapを転送。
  Workerは四隅検出→448×448射影補正→ImageNet RGB normalize→128次元Milo→
  float16全辞書cosine検索（0/180度）。画像/embeddingを外部送信しない。
- cornelius-2.12: HF revision `9280009f5a66f75f952820d9dadb894909b759b7`、
  4,407,545B、SHA256 `650da3cc3e9ac778c6951de631f824ec1e63bdabf3aaa39a35d7435af625612e`。
- milo-1.0.0: HF revision `9bcc5e809e936b8c5630d1e7101aae1de1e76621`、
  5,191,100B、SHA256 `bd13d8d60383c69da04dce261f32e93fdaeaa8fd618fbc991e7385f71b3d45df`。
- catalog: milo1 / scryfall/mtg v52、113,113 rows、128 dimensions float16。
  base50＋delta51/52。feed source blob `037ff1f2e74faccfdeea9043f0a021bff138bc82`、
  checked_at `2026-10-03T12:37:28Z`。model family/hash一致を必須検査。
- upstream scanner commit `2a122d00d25c8d112a90e47bf235a021e0c53b0c`、ORT 1.24.3、
  常にWASM/1thread。Android WebGPU問題を理由にGPUを有効化していない。
- candidate gateはcosine≥.75、異なるOracle間margin≥.025、valid quad・2一致。
  実写真で校正していない試験値。cosineを確率として表示しない。版/言語/加工は
  推論確定とせず、候補固定後に手動確認。file repeatは同一画像の2実行で独立標本ではない。
- 結果固定、背景、pagehideはtracks.stop。stale generationを捨て、次scanは結果reset。
  Workerは再利用、pagehideはterminate。中止/timeoutはPromiseを必ずsettleする。
- 日本語表示版は物理/価格選択とは別。multifaceは各面を描画、日本語印刷本文と
  英語Oracleを明確に分離、欠損はそのまま表示。リモートHTML挿入なし。
- 版一覧はpaper printingsを全ページ。実物言語はexact IDに切替。同じ版に指定言語が
  なければ別版選択と明示。価格はfinish対応欄だけ、日本語欠損でもENへ黙って切替しない。
- Scryfall requestsは110ms間隔、24h tab-memory cache、12s timeout、429自動retryなし。
  FXはFrankfurter v2 ECB、1h cache、published date、固定fallbackなし。
  quote変更時は即clear、各success/error/FXにtoken照合、card ID/lang/oracle IDも照合。

## 起動・再試験

`npm ci && npm run dev -- --port 5173` → **http://localhost:5173**。
この環境では待受け不可なのでURLを稼働中とは報告しない。
モデルはgesture後にupstreamから取得。browser remote取得不可なら
`npm run assets:prepare` → **http://localhost:5173/?localAssets**。
本番成果物は`npm run build`の`dist/`、確認は`npm run preview -- --port 4173`。
公開ではなくローカル検証のみ。READMEにsecure context/camera条件と全commandを記載。

環境の許可がある独立QAは `npx playwright install chromium`、`npm run test:e2e`、
`npm run assets:prepare`、`npm run evidence:live` を実行できる。
`artifacts/live/`はignored。公式sampleは固定URLから取得するが、正解ラベルを人手確認し、
カタログ画像との一致、upstream sample、独立実物写真を別クラスで報告する。
現時点ではどの実画像についてもモデル認識成功を取得していない。

コミット権限のあるコーディネータ向けに全変更のunified patchを
`artifacts/mvp-changes.patch`に保存。tracked diffと新規textファイルを含み、
model/catalog binary/card image/node_modules/dist/test-resultsは含めない。
別の適切なcheckoutで`git apply --check`してから適用できる。
本担当は別worktree/metadataを作って制限を迂回せず、元worktreeを保持する。

## 測定・ライセンス・残件

| 証拠 | 状態 |
|---|---|
| 型検査、既存103＋追加15 unit/regression | PASS、実装者自己検査 |
| production artifact生成 | PASS、dist、shellサイズは上記 |
| desktop/mobile viewport browser assertions | BLOCKED（Chrome起動/localhost制約）、PASSではない |
| actual model / official sample / independent photo | NOT RUN（DNS failureで資源取得できず） |
| live Scryfall + live FX表示 | BLOCKED（両host DNS failure）、値/時間実測なし |
| desktop navigation/camera/model/scan/price latency | NOT MEASURED。buildの22msをstartupとして使わない |
| iPhone Safari / Android Chrome / 実機camera/perf | **NOT RUN** |
| 独立TEST/QA、別worktreeのpinned統合候補 | NOT RUN（本担当は他worktreeを編集しない） |
| public release | 未承認、NO-GO |

初期bundleにモデル/catalogを含めず、local marksはリング300件、API解析ログ送信なし。
十分な認識精度/速度、Safari互換、発熱/メモリ、offline model復旧、cache quota、
gallery画像の巨大decode、特殊枠・同絵再録・日本語・foilの棄却率は未検証。

コード/重みAGPL-3.0、catalogソフトウェアのMITとデータ権利、Scryfall画像/カード権利、
Frankfurter/ECB rate terms、ORT MITを第三者noticesで分離。AGPL全文・変更表示あり。
別ライセンス/有料サービス購入なし、モデル/catalog/imageをgitに入れていない。
Runtimeの事前既知SHA検証は未実装（固定version URL＋download後hash記録）。
モデル/catalogには事前hash照合あり。内部実験許可を公開許可とは解釈していない。

**残件を解消する条件:** localhost/ブラウザprocess/networkが許可された環境で
browser smokeと実モデル/実APIを実行して発見不具合を修正。その後、同一pinned commitを
独立QAが検証し、実機測定を行う。公開は別途ライセンス適合判断とユーザー承認が必要。
この環境の拒否を回避するための権限変更や迂回は行わない。
