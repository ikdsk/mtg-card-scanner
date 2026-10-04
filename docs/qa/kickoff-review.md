# 初期統合候補 — 独立QAレビュー

## 判定と承認範囲

**Bootstrapの純粋ドメイン実装: PASS（限定承認）。MVP公開: BLOCKED／未承認。**

- 対象SHA: `2a7bbd6510c1ef7b50e8d004f1667042be7356fa`、専用worktree `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa`、detached HEAD。
- 実装者・独立TEST作成者とは別のQAコンテキストで、仕様、実コード、全テストを読み、固定候補を独立実行した。製品コード・テスト・設定の実装／修正、commit、pushなし。
- 現契約で確定したbootstrap範囲について、ブロッキングなsecurity concern／logic errorは検出しなかった。未決事項を勝手に確定仕様として扱わない。
- JSONの `passed: true` はこのローカルbootstrapレビューだけを指す。P0全出口、GitHub CI、private設定、Obsidian同期の確認、MVP完成、公開許可、実機性能の承認ではない。

## 検査範囲・環境・実行証拠

基準: `AGENTS.md`、`docs/contracts.md`、`docs/development-plan.md`、`docs/agent-briefs.md`。受入計画は `docs/qa/acceptance-plan.md`（競合時は現契約優先）。`src/domain/{pricing,selection}.ts`、unit/regression全4ファイル、package/lockfile/tsconfig/CIも確認。

- `git rev-parse HEAD`: 上記SHA。開始時 `git status --short`: 空。
- `git diff 24d1c04 HEAD -- src/domain tests`: PRICE/STATEの追加実装・unit testsを確認。`git diff --check 24d1c04 HEAD`: exit 0。独立regressionも現物を全文読取。
- 環境実測: macOS 26.5.2 (25F84)、Node v24.2.0、npm 11.3.0。
- `npm ls --depth=0`: @types/node 26.6.4、typescript 7.0.2、vitest 5.0.3、exit 0。
- **独立実行 `npm run check`: exit 0、`tsc --noEmit` PASS、Vitest v5.0.3: 4 files passed / 103 tests passed。** 出力時刻 15:47:19、suite duration 98ms。この時間はスマホ性能値ではない。
- 既存の親がinstallした専用worktree依存を使用。QAは `npm ci` を再実行していないため、fresh install／ネットワーク調達の独立再現確認はNOT RUN。package-lock v3のroot devDependencies/enginesとpackage.jsonの一致は機械確認。
- 先行コマンド `npm run check -- --cache=false` もexit 0／103 tests PASSだったが、npmが `false/` にローカルcacheを生成した。cache無効化の証拠とは扱わない。生成物2ファイルの正確なパスを確認してQA由来分だけ削除し、空のgit statusへ復旧後、引数なしの正規check結果を採用した。
- ソース直接importの追加assertion: ABA旧token拒否、最大安全USD centsの正確なラベル、100 USD × 1.005 = ￥101、**3 assertions PASS**。Nodeのexperimental type-stripping warningのみ。追加テストファイルは作成していない。
- 過去のRED→GREENは実装者報告に依存し、本QAで過去のTDD過程を独立再現したとは主張しない。`docs/reports/independent-test.md:25-35` は旧base未統合時のimport blockerの記録であり、本候補のFAILではない。本報告がこのSHAの独立GREEN証拠となる。

## 契約対応・ロジック所見

| 項目 | 証拠 | 判定 |
|---|---|---|
| USD欠損と0、trim、文法、cents安全上限 | pricing.ts:15-22、unit pricing:40-57、regression pricing:8-22,47-53 | PASS |
| FX不正時はUSD維持、架空レートなし | pricing.ts:23、unit pricing:31-38 | PASS |
| 暦日厳密性、閏年・存在しない日付拒否 | pricing.ts:4-12、unit pricing:23-29、regression pricing:28-34 | PASS（timestamp拡張文法は下記保留） |
| decimal積のhalf-up、指数表記FX、JPYのみoverflow | pricing.ts:24-34、unit pricing:11-21、regression pricing:36-60 | PASS |
| 手動優先、全identity比較、同値認識は冪等 | selection.ts:5-15、unit selection:9-23,93-105 | PASS |
| 同値手動再選択もrevision更新、旧価格拒否 | selection.ts:14-19、regression selection:55-75 | PASS |
| 次scanでgeneration更新・手動解除、旧世代拒否 | selection.ts:26-31、regression selection:77-89 | PASS |
| 入力state非破壊、accepted selection clone、token snapshot | selection.ts:11,15,22-23、regression selection:102-131 | PASS |

formatterは型付きの純粋関数。無型JSONの実行時schema検証、価格鮮度、市場・版・言語・加工一致、価格ラベルの「海外参考／概算」説明は現在のformatter出力契約ではない（contracts:12-15,30-37）。これらの欠如を現formatterの欠陥には分類しない。将来adapter/UIで実装・検証することが必須。token一致も価格対象一致そのものを証明しない。

## 静的安全検査

`git ls-files` の追跡ファイル全文をPython正規表現で走査（node_modulesや未追跡の個人データは対象外）。secret代入／private-key／GitHub-token形、eval/exec/Function、危険shell／child_process、fetch/XHR/WebSocket/sendBeacon/axios/curl/wget、unsafe deserialization／innerHTML、test.skip/only/todoを確認し、差分と製品ソースを目視照合した。

- secret／危険shell／unsafe deserialization／skip・only・todoの一致なし。
- eval/execの唯一のヒット: `src/domain/pricing.ts:5` の **RegExp.exec**。コード評価ではなく、安全上の指摘には該当しない。
- networkの唯一のヒット: `docs/research/recognition.md:10` の過去のcurl調査説明。製品の通信処理ではない。
- 製品ソースにHTTP、camera、画像送信、storage、system clockなし。package scriptsは型検査とテスト。CIはcontents:readでnpm ci/checkを実行するだけ（.github/workflows/ci.yml:6-22）。
- lockfileのresolved hostは `registry.npmjs.org` のみ。hasInstallScriptは `node_modules/fsevents` に存在。これは悪性の証拠ではなく、インストール時の第三者コード実行という別の監査範囲。依存パッケージ全コードの監査、脆弱性DBの最新照会、CI actionの内容監査はNOT RUN。
- 静的ヒューリスティック検査であり、秘密が絶対存在しないことや依存supply-chainの全面安全性は保証しない。確認範囲内のsecurity blockerなし。

## 非ブロッキング提案・設計保留

### SUG-01 — timestampプロファイルの明文化（設計保留）

位置: `src/domain/pricing.ts:5`、`docs/contracts.md:14`、`docs/reports/independent-test.md:39`。

合成入力 `formatReferencePrice('1', {jpyPerUsd:150, asOf})` の実測:

| asOf | 実際のJPY |
|---|---|
| `2026-10-04T12:00:00` | ￥150 |
| `2026-10-04T12:00:00+23:59` | ￥150 |
| `2026-10-04T12:00Z` | null |
| `2026-10-04T24:00:00Z` | null |

現契約はISO date/timestampと述べるが、timezone必須、offset上限、秒省略、24:00、拡張年等の採用subsetを列挙していない。上記に対する確定したexpectedがないため、今の実装を仕様違反と断定しない。DATA接続前に採用プロファイルとtimezone無しの意味をLEADが決定し、独立契約テストを追加することを推奨。

### SUG-02 — generation/revision数値領域の明文化（設計保留・将来リスク）

位置: `src/domain/selection.ts:11,15,19,27`、`docs/contracts.md:21-28`、`docs/reports/independent-test.md:41`。

極端な状態を手動構築した読取プローブでは、revisionが9007199254740992のとき+1しても同値となり、選択変更後に旧tokenが受理された。再現:

```sh
node --input-type=module -e 'import * as s from "./src/domain/selection.ts"; const a={oracleId:"synthetic-a",printingId:"synthetic-a",language:"ja",finish:"nonfoil"}; const before={...s.recognize(s.initialSelection(),a,0),revision:Number.MAX_SAFE_INTEGER+1}; const after=s.overrideSelection(before,{...a,printingId:"synthetic-b"}); console.log(before.revision,after.revision,s.acceptsResponse(after,s.requestToken(before)));'
```

実際: `9007199254740992 9007199254740992 true`。意図する安全性は「版変更後の旧token拒否」だが、安全整数範囲外の入力／上限時挙動は現契約で未定義であり、通常の初期状態からの製品利用で再現した欠陥ではない。**既定仕様内のlogic errorには計上せず、明示的な設計保留として残す。** 外部state復元を導入する前に整数範囲の検証と上限時の安全な停止・新session方式を決める。単純な0へのwrapは旧token衝突を招くため避ける。

### SUG-03 — provider境界と再現性の後続ゲート

contracts:30-37、development-plan:62-69,103-108,171-178に従い、実quoteのtarget・generation・revision整合、鮮度、障害、入力schemaをadapterで検査する。型外のundefinedやnumberをformatterに直接渡すケースを現契約違反と誤分類しない一方、adapter接続時には拒否／欠損処理と上限長を定義する。GitHub CIのこの正確なSHA、fresh npm ci、private設定、計画同期はLEADの残ゲート。Node 24 runtimeに対する@types/node 26の将来API混入も依存更新時に整合を確認する。

## 未検証・公開ブロッカー

以下はすべて **NOT RUN**。機能が未接続のためbootstrap検査成功で代替できない。

- UI／日本語レイアウト・a11y・誤認識訂正画面、manual overrideの画面統合、価格消去／loading／errorの非同期制御。
- 実カメラ、権限拒否、背景復帰、camera-firstとモデルロードの並行開始、実画像認識精度。
- LIVE Scryfall／FX、版・言語・加工の実照合、取得日時・鮮度・キャッシュ・429/5xx/offlineの実データ動作。
- iPhone Safari/PWA、Android Chromeの実機、初回／再訪／連続スキャン、p50/p95／最大／失敗率／発熱。
- モデル・重み・画像の最終採用ライセンス、配布物・ホスティング・費用・画像取扱の承認。今回はモデル取得／実行／画像送信を行っていない。

よってAC-01〜AC-16全体の製品合格やG3/G4/G5通過は宣言しない。性能の数値目標も暫定のまま。**MVP公開は証拠不足によりBLOCKED、ユーザーの公開承認も別途必要。**

## 成果物と変更制限

保存先は `docs/qa/kickoff-review.md` と `docs/qa/kickoff-verdict.json` のみ。製品実装なし。最終差分を確認してこの2ファイル以外の追跡／未追跡変更を残さない。候補に修正が入った場合は新SHAで型検査・全テスト・関連QAを再実施する。
