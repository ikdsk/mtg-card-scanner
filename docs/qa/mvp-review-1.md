# MVP候補 独立コードレビュー — NO GO

## 対象と検証範囲
- base: `38a9f58e0b8caf4b15c44fc518db3fce4adac125`
- worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-mvp`
- patch SHA-256: `a11bb312a651634fd72ea7dc5e1f44c596e764f78b0617f5f77387a018e3ec56`（独立照合済み）
- tracked差分だけでなくuntrackedのsrc/data, main, recognition, ui、worker/catalog主要経路、scripts、browser tests、CIを確認。巨大vendor全行の完全監査は行っていない。
- 製品コード／設定の変更なし。レビュー証拠はresearch内だけに作成。
- 親の118 unit tests + build PASS、Playwright 6 FAILを受領。本review worktreeにnode_modulesがなくtypescript importはERR_MODULE_NOT_FOUND。単体/ブラウザ全試験を独立再実行したとは主張しない。
- 独立probeはNode 24.2.0の型変換で実際の候補modulesを読み込み実行。合成providerとライブlicense取得を明確に分離。
- 実Scryfall検索をカスタムUser-Agentで実行：稲妻 HTTP200/76件、Lightning Bolt HTTP200/2件。日本語検索非対応とは判定していない。デフォルトNode User-Agentは400で拒否されたため変更して再試行。

## 判定
不合格。native fetchの呼出不備と資産準備404に加え、検索切替時の旧認識応答復活、無効応答キャッシュ、provider identity検証不足、更新失敗時の完全組fallback欠如がある。重大な画像外送信／HTML注入／秘密埋込みは確認していないが、実機・実画像の品質保証は未完了。

## 必須修正
### R1 [P1] ブラウザ標準fetchをJsonClientのthisで呼び、全データ取得が失敗する
- 場所: `src/data/http.ts` 行 9, 20
- 再現: 通常ブラウザで名前検索、カード取得、FX取得を実行。親の候補実行ではPlaywright 6件全失敗、Illegal invocation。独立レビューでもthis.fetcher(url, ...)という不正receiverを確認。
- 実際: Scryfall/FX経路が使えず、認識後の結果表示も成立しない。
- 期待: 実ブラウザ標準fetchで取得できる。
- 修正案: 保存時にglobalThisへbindするか、関数をローカル変数へ取り出して呼び出す。モックだけでなくnative fetchを使うブラウザ回帰試験を通す。
- 根拠/限界: ソース独立確認。ブラウザ6 FAILは親から受領した結果であり本レビューで再実行していない。

### R2 [P1] 名前検索への切替が保留中の認識カード取得を無効化しない
- 場所: `src/main.ts` 行 163-173, 187-190
- 再現: 認識候補確定→openIdのrepo.cardを遅延→ユーザーが訂正の名前検索を開始→旧card応答を解放する。
- 実際: searchはscanGenerationだけ進めdetailGeneration/detailRequestを変更しないため、旧openIdがopenCardを実行し旧候補を結果として復活させる。検索へ戻る意図に反し、古い認識応答を採用する。
- 期待: 検索へ切り替えた時点で古い認識由来の詳細取得を破棄する。
- 修正案: search開始時にdetailGenerationを進めdetailRequestをabortし、必要に応じ結果セッションもリセット。scan/search/detailを横断する操作世代を導入し、遅延応答のE2Eを追加。
- 根拠/限界: 制御フローの静的確認。実ブラウザ再現は未実行。

### R3 [P1] ローカル資産準備が存在しないONNX Runtime LICENSE URLで必ず失敗する
- 場所: `scripts/prepare-assets.mjs` 行 29-30
- 再現: npm run assets:prepareの最後のURL https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/LICENSE を取得。
- 実際: 独立HTTP実測404。スクリプトはexitCode=1となり、ランタイムのLICENSEも保存されない。
- 期待: 再現可能な準備手順が成功し、正しいライセンス／必要なthird-party noticesを同梱する。
- 修正案: 1.24.3の実際の配布物または対応する固定上流commitから正しいLICENSEと必要な通知を取得する。存在と内容／固定hashを確認し、クリーン状態のassets:prepareを再実行。単に失敗を握りつぶさない。
- 根拠/限界: mvp-review-1-probe.mjsでHTTP404を独立確認。

### R4 [P2] 意味的に不正なHTTP200応答を長期キャッシュし再試行が復旧しない
- 場所: `src/data/http.ts; src/data/repository.ts` 行 http.ts:22-25; repository.ts:34, 42-44, 63
- 再現: card APIにHTTP200 {id:"malformed"}を一度返し、同一カードを再取得する。上流は2回目には正常応答できる条件にする。
- 実際: 独立合成probeで2回とも「カード情報が不正です」、fetch呼出は1回。不正JSONが24時間（FXでは1時間）残る。ユーザーの再確認でもネットワークへ戻らない。
- 期待: schema/対象検証失敗した応答は成功キャッシュに入れず、再試行で回復する。
- 修正案: JsonClientへvalidatorを渡して検証成功後だけ保存、または失敗時にURLキャッシュを削除する。schema不正→正常の回復試験を追加。
- 根拠/限界: mvp-review-1-probe.mjs: calls=1, errors=[カード情報が不正です,カード情報が不正です]。

### R5 [P2] Repository境界が要求ID/oracle IDと応答の一致を確認しない
- 場所: `src/data/repository.ts; src/main.ts` 行 repository.ts:34, 46-57; main.ts:187-201
- 再現: repo.card("REQUESTED")へのHTTP200でid="OTHER"の有効なCardを返す。またはprintings(A)にoracle_id=BのCardを混ぜる。
- 実際: 独立probeでrequested=REQUESTED, returned=OTHER。openIdはそのまま採用し、以後session.selectはOTHERを新しい正解対象として検証するため防げない。printingsの別Oracleカードも手動候補／日本語表示へ混入する。
- 期待: カードIDと印刷版一覧のOracle対応をprovider境界で検証し、不一致をエラーにする。
- 修正案: cardでc.id===requestedId、printings全ページでc.oracle_id===requestedOracleIdを検証。通常検索の任意クエリは維持。異なるidentityを返すprovider回帰試験を追加。
- 根拠/限界: cardの不一致受容は独立合成実行。printings経路は静的確認。

### R6 [P2] 更新失敗時に最後の完全なモデル／辞書組へ戻す経路がない
- 場所: `public/recognition/lib/collectorvision-catalog-v2.mjs; public/recognition/scanner.worker.mjs` 行 catalog:339-379; worker:754-763
- 再現: 有効な旧snapshot v51を残し、v52 deltaをオフライン/HTTP失敗にして初期化する。
- 実際: 旧snapshotを発見してもapplyUpdateの例外が外へ伝播する。workerもversion===52を必須とし、旧完全組での継続はできない。現在のv52固定は問題を先送りするだけでcontracts.md:39と開発計画:59の更新復旧要件を実装しない。
- 期待: 新しい組の完全検証成功まではactiveな旧組を保持し、更新失敗時は互換な旧組へ戻る。
- 修正案: 完全組を単位とするactive/candidate管理を導入。旧モデルhashと辞書の互換性を維持してfallbackし、更新途中失敗と再開を試験。異なるモデルを無条件に旧辞書と組み合わせない。
- 根拠/限界: 静的確認。IndexedDBを使う実ブラウザの中断試験は未実行。

## その他の改善／リリース前ゲート
- **S1 [P2] 専用port/baseURLとサーバー同一性確認** — `playwright.config.ts; tests/browser/smoke.spec.ts` (config:4-6; smoke:11): 5173固定かつローカルreuseExistingServer=trueで他プロジェクトを検証し得る。親による別awarsサーバ占有の報告あり。port/baseURLを環境変数化しNO_SERVER routeも同値へ揃える。専用ポート＋reuse=falseを基本にする。
- **S2 [P2] 改変宣言の不整合** — `public/recognition/THIRD-PARTY-NOTICES.md` (8-11): catalog client is unmodifiedとの記述に反してcatalogのfetchImplをbindする変更があると提供コンテキストにある。上流固定commitとdiffを照合し、catalog改変も列挙。正しいLICENSE URL、第三者通知、対応ソース提供方針が揃うまで公開不可。
- **S3 [P2] live evidenceが認識の正解や価格成功をassertしない** — `scripts/live-evidence.mjs` (28-35): target出現だけで進みexpectedCardIdと実結果を比較せず、価格の「取得できません」も待機成功扱い。failureが空でも縦通し成功の根拠にならない。実際の認識ID照合とprovider-target/価格照合を機械判定し、推論の正しさと単なる実行完了を分離。
- **S4 [P3] whitespaceと残存upstreamコメント** — `public/recognition/LICENSE-AGPL-3.0.txt; public/recognition/lib/collectorvision-catalog-v2.mjs` (末尾): 親報告のdiff --check末尾空行を整える。workerのマルチスレッド/設定UIに関する古いコメントも現実の1thread設定へ合わせる。ライセンス本文そのものの変更は最小限。

## 独立probe実行
```sh
node --experimental-transform-types /Users/dikeda/workspace/mtg-card-scanner-research/mvp-review-1-probe.mjs
```
```json
{"probe":"invalid-200-response-cache","calls":1,"errors":["カード情報が不正です","カード情報が不正です"],"synthetic":true}
{"probe":"repository-request-identity","requested":"REQUESTED","returned":"OTHER","synthetic":true}
{"probe":"runtime-license","url":"https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/LICENSE","status":404}
```

## 未検証
- 実機Safari/Android、実カードの認識精度、端末の発熱・低メモリ、実IndexedDB中断復旧はNOT RUN。
- no image uploadはコード経路に明示的な送信を見つけないという静的所見であり、通信完全監査ではない。
- S2上流差分は本レビューでは再ダウンロード照合していない。親の差分情報と候補の改変宣言不整合を指摘したもの。
- R2/R6は静的に確定する制御フローの指摘。修正後に遅延／障害注入ブラウザ回帰テストを必要とする。


## 追加一次確認 — 修正担当へ優先通知
### R7 [P1] Scryfall検索500ms制限と429後30秒停止を実装していない
- 場所: src/data/http.ts; src/data/repository.ts; docs/contracts.md
- 行: http.ts:9, 13-21; repository.ts:46-55; contracts.md:61-63
- 再現: 高速な合成HTTP応答で検索page1→page2、または429→ユーザー再試行を行いfetch開始時刻を計測する。実サービスへ過負荷試験はしない。
- 実際: 独立probeで検索開始間隔111ms、429後の再試行も111ms。printingsの全ページ取得は/cards/searchを連続使用するため通常操作でhard limitを超過し得る。一律110msとエラー文だけで、cooldown状態はない。
- 期待: /cards/searchは500ms以上、その他対象endpointも公式別制限を満たし、429後は少なくとも30秒アクセスを止める。
- 修正案: endpoint別の共有スケジューラとprovider単位cooldownUntilを導入し、検索・ページング・手動再試行を全て通す。500ms/30秒に余裕を持たせ、Retry-Afterもあれば尊重。待機中abort、別操作からの再送抑止をfake clockで試験し、contracts/noticesの110ms記述を更新。
- 根拠: 2026-10-04に公式 https://scryfall.com/docs/api/rate-limits を独立HTTP取得して確認：search/named/random/collection各2/sec(500ms)、other10/sec、429後30秒。mvp-review-1-probe.mjsでsearch-start-gap=111ms、429-retry-gap=111ms。mvp-release-risks.mdとも照合。

検索用500msキューと429 cooldownは任意改善でなく必須修正。自動retryがないだけでは、ユーザー再試行や別カード操作からの短時間再送を防げない。web_extractはsearch-only backendで失敗したためurllibで一次ページを直接確認した。最終判定はlogic_errors 7件、security_concerns 0件、passed=false。
