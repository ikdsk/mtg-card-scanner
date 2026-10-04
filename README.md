# MTG Card Scanner — ローカル検証用MVP

Vite + TypeScriptの日本語モバイルUI。端末内のCollectorVision/WASM認識、
カメラ・端末画像・日本語/英語検索、Scryfall印刷版/言語/加工とUSD参考価格、
Frankfurter/ECBの公表USD/JPYを接続しています。

**実Chromiumでのブラウザ12ケース（合成API応答）はPASS。**
ビルド成功やmockテストは実カード精度・スマホ性能の証明ではありません。
修正・実モデル／ライブAPIの結果は `docs/reports/mvp-fix.md`。
`docs/reports/mvp-implementation.md` は初回実装時の環境制約を記録した履歴です。

## 起動（Node 24）

```sh
npm ci
npm run dev -- --port 4187 --strictPort
```

`http://localhost:4187` を開きます。モデルは「カメラでスキャン」または
画像選択後に初めてダウンロードされます。名前検索にモデルは不要です。
初回資源はモデル約9.6MB、辞書約35.6MB、別途ONNX Runtime。
キャッシュの永続性はブラウザ容量・プライベートモード等に依存します。

カメラはHTTPSまたはlocalhostのsecure contextと明示許可が必要です。
スマホからPCのHTTP/LAN IPへ接続してもカメラは通常使えません。
実機試験は適切なHTTPS環境をコーディネータが準備してください。
このタスクは公開デプロイ・LAN公開・証明書警告の回避を許可していません。

```sh
npm run check
npm run build
npm run preview -- --port 4187 --strictPort
npx playwright install chromium
npm run test:e2e
```

Playwrightはdesktopと390×844のmobile viewport、合成API応答での検索、
日本語表示、版/言語/加工、null/0、FX障害、カメラ拒否を試します。
mobile viewportは実機Safari/Chromeではありません。
Chromeを明示する場合は `PLAYWRIGHT_CHROME_PATH` に実行ファイルを指定。
通常はPlaywright付属のfull Chromium（channel: chromium）を使います。
E2Eはbuild済みdistを専用4187で配信し、既存サーバーを再利用しません。
`MVP_PORT`で変更できます。E2E前に必ず`npm run build`を実行してください。

ローカル待受けが不要なmock試験も用意しています（実ビルドを
Playwright routeで応答。実カメラ・ネットワークの代替にはなりません）：

```sh
npm run build
PLAYWRIGHT_NO_SERVER=1 npm run test:e2e
```

## 実モデル/プロバイダの再現試験

ブラウザが配信元にアクセスできない場合、許可済みの固定資源をローカルに
取得できます。ローカル配信は辞書gzipをHTTP自動展開させず、その圧縮bytesを検証します。
モデル・辞書のサイズ/SHA-256を検証し、`.partial`から
完成ファイルへ切替。失敗時は既存の完成ファイルを破壊しません。

```sh
npm run assets:prepare
npm run dev -- --port 4187 --strictPort
```

`http://localhost:4187/?localAssets` を開きます。資源は無視対象の
`public/recognition/assets/` と `public/recognition/vendor/`。
**モデル・辞書・カード画像をgitに追加しないでください。**
Runtimeはバージョン固定URLで取得し、取得後のハッシュを記録します。
Runtime本体の事前既知ハッシュ照合は未実装で、モデル/辞書の照合と区別します。
公式v1.24.3のLICENSE・ThirdPartyNotices.txtは既知SHA-256を照合して保存します。

```sh
npm run evidence:live
```

公開参照画像manifestの`latest-ja`を読み取り、実ブラウザのファイル入力→
実モデル→候補、その後ライブ検索/価格/FXを試します。raw応答・計測・画面を
`artifacts/live/<label>/` に保存します。ネットワーク、localhost待受け、ブラウザの
起動権限が必要です。既定manifestは `/Users/dikeda/workspace/mtg-card-scanner-research/mvp-fixtures/manifest.json`。
`MVP_FIXTURE_MANIFEST`と`MVP_FIXTURE_LABEL`で公開参照fixtureを指定できます。
ビルド済みアプリを4187で配信します（先に`npm run build`）。
独立写真精度・スマホ性能・多数回測定の代替にはなりません。

辞書更新失敗／復旧の制御試験は `node scripts/catalog-fallback-evidence.mjs`。
実モデル・検証済みv51資源・実IndexedDBを使い、feed切替とHTTP503だけを合成します。
互換モデルhashの旧完全snapshotのみ復旧対象で、途中の更新結果は有効化しません。

## 情報と利用上の制限

- 認識はカードの候補です。実物の版・言語・加工を必ず手動確認してください。
  日本語公開参照画像の稲妻ではOracle同一性が一致しましたが、版・言語は一致しません。
  最新日本語参照画像と背景付き派生画像は閾値未達で棄却。
  実物写真、特殊枠、反射、Foil等の精度は未検証です。
- 日本語**印刷**本文と英語**Oracle**本文を別表示。表示用日本語版は
  選択価格対象と独立し、取得元のセット/番号を表示します。
- 価格は選択したScryfall IDと加工のUSD欄のみ。日本語価格が欠けても
  英語価格へ自動置換しません。0は実価格、nullは価格なし。
- USDは海外参考価格で国内販売/買取価格ではありません。JPYは概算。
  為替を取得できなければUSDのみ。固定レートはありません。
- Scryfallは検索系510ms・他110ms以上の共有間隔。429後は最低30.1秒待機し、
  長いRetry-Afterを尊重。検証済み応答だけ24時間のタブ内cache、FXは1時間。
  HTTPは12秒timeout、429は自動連打せず手動再試行。価格の応答確認時刻と
  提供元の価格更新時刻は区別し、提供元更新時刻は未取得と表示します。
- 画像/特徴量の外部送信・アカウント・解析analyticsなし。
  モデル配信元、カードID/検索語、為替ペアへの通信はあります。
- 結果固定・背景・ページ離脱でカメラを解放。背景からはボタンで再開。
- ダーク/ライトはOS設定に追従。初期シェルにモデルを含めません。

## ライセンス/公開

`public/recognition/THIRD-PARTY-NOTICES.md` にコード、モデル、辞書、画像、
APIの条件を分離して記載。CollectorVisionのAGPL全文を同梱し、変更を明示。
別ライセンスは取得していません。MIT扱いにしていません。
ローカル/内部実験のみ。公開ネットワーク利用・配布にはユーザーの明示承認、
AGPLのCorresponding Source提供を含む適合判断、モデル/辞書/画像条件の
確認が必要です。private GitHubは公開アプリ許可やsource提供義務の代替ではありません。
