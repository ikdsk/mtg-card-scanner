# MVPブラウザ修正・実経路検証 — 2026-10-04

branch: `fix/mvp-browser-verification`、専用worktree: `mvp-fix`。
base: `38a9f58e0b8caf4b15c44fc518db3fce4adac125`。元MVP候補（未追跡text含む）を引き継ぎ、修正と一緒にcommitする。SHAは引き渡し／ignored検証ログに記録。
他worktreeは変更していない。資源は元MVPのignored publicディレクトリから読み取り専用コピーし、このworktreeで検証。`npm ci`で依存を分離。push/merge/deploy/購入/私有画像/秘密情報の調査なし。テスト待受けはloopback **4187**のみ、起動したサーバー・ブラウザは全て終了。

## 修正

- `src/data/http.ts`: native fetchのreceiver不備を修正。schema/identity検証成功後だけcacheへ保存。共有transport/providerスケジューラで検索系510ms、その他110ms以上。429後最低30.1秒、より長いRetry-Afterを尊重。予約／待機／queue中abortは即時settleし再送しない。
- `src/data/repository.ts`: requested card IDと各printingのOracle IDをcache前に照合。card/FX/search不正HTTP200後の再試行が回復する。
- `src/main.ts`: 訂正検索開始で保留中認識詳細をabortし、詳細世代・結果セッションを無効化。
- `public/recognition/scanner.worker.mjs`: handler登録前のtop-level awaitを除去。runtime import待ちに届いたinitを失わない。モデルhashが同じ互換v50/v51 snapshotを許容しfallbackを通知。
- `public/recognition/lib/collectorvision-catalog-v2.mjs`: 更新失敗時、以前の完全・互換snapshotだけで継続。途中candidateは有効化／保存しない。復旧後の完全candidateを原子的に保存。
- `vite.config.ts`: 辞書gzipはopaqueな圧縮assetとしてdev/previewで配信。自動HTTP展開によるsize/hash不一致を防ぐ。パスを資源ディレクトリ内に限定しstream配信。
- `scripts/prepare-assets.mjs`: ONNX Runtime公式v1.24.3の実LICENSE・ThirdPartyNotices.txtを取得し固定SHA-256照合。404を握りつぶさない。
- `playwright.config.ts`, `tests/browser/*`: default4187、`MVP_PORT`対応、既存server再利用なし、実distをpreviewで配信、full Chromium。元assertionsは維持（同名h2/h4はlevel2に明確化）。遅延runtime init、gzip bytes、訂正検索raceの回帰を追加。
- `scripts/live-evidence.mjs`, `scripts/catalog-fallback-evidence.mjs`: 実モデル／APIの機械照合、手動実物版変更、環境・commit・cache条件・画面・raw応答をignored artifactへ保存。棄却／エラーは非zero exit。
- README／contracts／第三者noticesを現在の証拠へ更新。AGPLとcatalog末尾は余分な空行だけ除去。元実装報告は履歴として保持。

独立レビュー `mvp-review-1.json` は検証段階に到着。R1〜R7に対応。S1/S3/S4も対応。
S2のfetch bind改変疑いは固定upstreamと実diffを照合：bindは元から上流に存在。今回のfallback改変はnoticeに明示した。

## 実行結果とRED→GREEN

| 実コマンド／挙動 | REDの実結果 | GREENの実結果 |
|---|---|---|
| `npx vitest run tests/unit/providers.test.ts` receiver回帰 | `Illegal invocation` | ローカル関数呼出でPASS、注入mockも維持 |
| `npm run build`; `npm run test:e2e` 元6ケース | 全6 FAIL、検索結果なし | 6 PASS。見出し階層の曖昧性も解消 |
| `npm run assets:prepare` | runtime LICENSE HTTP404、exit1 | 全model/catalog hash/size確認、公式license/notices取得、exit0 |
| `PLAYWRIGHT_NO_SERVER=1 npm run test:e2e -- --grep 'worker retains'` | init後messages=[]、2 FAIL | handler先登録で2 PASS。その後実server全件でもPASS |
| `npm run test:e2e -- --grep 'catalog transport'` | gzip58Bがbrowserで38Bに自動展開、2 FAIL | 圧縮bytes/size/SHA照合、2 PASS |
| providers invalid200回復 | 同じ不正cardをcacheから再取得しFAIL | card/FX/search再取得で回復PASS |
| providers requested identity | OTHERのcardがそのままresolve、FAIL | card/printing対象不一致を拒否し再試行PASS |
| providers search fake clock | start gap110msでFAIL | 510ms、共有client間もPASS |
| providers 429 fake clock | 別client再試行gap0msでFAIL | Retry-After35秒、最低30.1秒、abortもPASS |
| providers queue中abort fake clock | cooldown終了までsettleしない、FAIL | 即settle、取消requestはfetchされずPASS |
| `npm run test:e2e -- --grep 'manual correction'` | 旧認識resultがvisible、2 FAIL | 世代更新／abort後hidden、2 PASS |
| `npx vitest run tests/unit/catalog.test.mjs` | cached v51でもdelta503が伝播、FAIL | 互換fallback、異モデル拒否、復旧／atomic保存の3 PASS |
| `npm run check` 最終 | — | 型検査＋10 files / **129 tests PASS** |
| `npm run build` 最終 | — | PASS。初期JS26.77kB / gzip10.77kB、CSS4.64kB / gzip1.79kB |
| `npm run test:e2e` 最終 | — | 専用4187・actual built server・Chromium、**12 PASS** |
| dev server＋実browserでbase records fetch | — | 9,055,736B、SHA-256 ac911ecc…493ad6、Content-Encodingなし、PASS |
| `node --check` worker/catalog/runner、`git diff --check` | — | PASS |

新規unit/browser fixtureはSYNTHETICと明示。閾値、assertion期待値、skip、合格基準は緩和していない。
RED traces/screenshotsは `artifacts/{red,worker-red,gzip-red,search-red}/`。本工程は独立fix工程であり、別TEST/QAの承認を代替しない。

## 実モデルとライブAPIの証拠

macOS Darwin25.5.0 arm64、Node24.2.0、Playwright1.59.1、Chromium147.0.7727.15、desktop1280×900。新context／cold IndexedDB、検証済みlocal資源、WASM1thread、Cornelius2.12／Milo1.0.0／catalog v52。各画像n=1、同一画像2回の推論。独立写真ではない。

- `npm run evidence:live`: **latest-jaは棄却、exit1**。低score約0.497の別候補を画面へ採用しない。実モデル準備・推論は完了し、検索でAcademic Ascentのlive USD `$0.16`／概算`￥25`（FX157.67、2026-10-02）を照合。JA FRA#2へ手動指定すると選択ID一致／API price=null／「価格なし」が一致。
- `MVP_FIXTURE_LABEL=latest-ja-background npm run evidence:live`: 背景付き合成参照も棄却。Oracle候補はAcademic Ascentだがscore約0.690で閾値0.75未達。棄却を成功に数えない。
- `MVP_FIXTURE_LABEL=classic-ja npm run evidence:live`: **PASS**。稲妻Oracle `4457ed35-…` が一致、score約0.807／margin約0.208。候補は英語SUM#162で、入力の日本語4ED#208とは印刷版・言語が異なる。物理版推定の成功ではない。live手動検索では英語ID `7673784e-…` のUSD `$0.82`／概算`￥129` が応答と一致。最後に日本語ID `c16f20ed-…` を手動指定し、null価格を確認。
- `node scripts/catalog-fallback-evidence.mjs`: **3段階PASS**。実モデル・hash検証済みv51資源・実IndexedDBで、v51準備→制御HTTP503でv51継続（UI通知）→復旧しv52。feed切替と503のみ合成。異モデルを旧辞書と組み合わせない。

証拠は `artifacts/live/<label>/{evidence.json,desktop.png,manual-printing.png}`、`artifacts/catalog-fallback/evidence.json`、`artifacts/dev-catalog-transport.json`。
API画像・特徴量のuploadはなし。raw応答と選択ID・加工欄・USD/JPYの一致を機械判定。単なるエラー文の表示は成功にしない。Scryfall名検索は面名一致も返すため、runnerはOracle名に対応するボタンを選び、提供済み実物IDへのoverrideを別確認する。
スクリーンショットを実際に開き、日本語名／印刷本文とOracleの区別、価格対象、null表示を確認した。

## 制限・残件

最新日本語参照画像の認識は未解決（安全に棄却）。実物写真精度、iPhone Safari／Android Chrome、実カメラ、初回network転送・P50/P95・発熱は **NOT RUN / NOT MEASURED**。desktop viewportを実機合格にしない。desktop単発ではshell約40〜52ms、稲妻file→candidate約2.4〜2.6秒を観測したが性能合格は宣言しない。
統合候補を別worktreeでpinned SHA検証する独立TEST/QAはコーディネータ工程として残る。本担当は指定外worktreeを変更しない。公開／ライセンス適合の最終判断は未実施。
