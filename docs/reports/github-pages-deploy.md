# GitHub Pages デプロイ対応レポート

Base commit 5ac322d、branch `feat/github-pages-deploy`。

## 背景

このリポジトリにユーザー専用の `ikdsk.github.io` リポジトリは存在しないため、GitHub Pagesは
**プロジェクトページ**（`https://ikdsk.github.io/mtg-card-scanner/`）としてデプロイされる。
つまりドメインのルートではなく `/mtg-card-scanner/` というサブパス配信になる。

## 発見した問題

アプリのコードとHTML内に、サブパス配信では壊れる**絶対パスのハードコード**が複数あった。
`vite build`の`base`オプションは `<script src>` `<link href>` 等、ビルドがHTMLを解析して
書き換えられるアセット参照は自動変換するが、**JS実行時に文字列として組み立てているパス**
（`new Worker('/recognition/...')` 等）や、**ビルド時に解析対象にならないmeta/favicon属性**
までは書き換えない。

- `src/recognition/adapter.ts`: `new Worker('/recognition/scanner.worker.mjs')`
- `src/main.ts`: favicon画像src `/icons/mana-wheel.svg`、ライセンスリンク `/recognition/THIRD-PARTY-NOTICES.md`
- `index.html`: favicon/apple-touch-icon/og:image/twitter:imageの`href`/`content`属性

## 対応

1. `vite.config.ts` に `base: process.env.GITHUB_PAGES_BASE ?? '/'` を追加。
   環境変数を明示的に渡さない限り（ローカル開発、既存のTailscale配信、CIの`npm run test:e2e`含む）
   従来通り`base: '/'`のまま、挙動は一切変わらない。
2. `src/recognition/adapter.ts`、`src/main.ts` の絶対パスを `import.meta.env.BASE_URL` 経由に変更。
   `BASE_URL`は末尾スラッシュ付きで展開されるため、`${import.meta.env.BASE_URL}recognition/...`のように
   先頭の`/`を外した相対セグメントと連結する形にした。
3. `index.html` の favicon/apple-touch-icon/og:image/twitter:image を `%BASE_URL%`（Viteの組み込み
   プレースホルダ）に置き換え。`<script src="/src/main.ts">` は対象外（これはViteの開発時ソース解決
   パスであり、ビルド成果物では自動的に`<script src="{base}assets/index-xxx.js">`に変換される。
   `%BASE_URL%src/main.ts`にすると開発用エントリの解決自体が壊れてビルド失敗したため、元のままにした）。
4. `src/main.ts` 内の古い「ローカル・内部検証版。…公開・配布前にライセンス対応と公開承認が必要です」
   という文言を発見し、既に完了している公開承認・AGPL-3.0ライセンス整備の内容に合わせて修正した
   （以前のREADME/THIRD-PARTY-NOTICES.md更新時に、この画面内テキストの存在を見落としていた）。
5. `.github/workflows/deploy.yml` を新規追加。既存の `ci.yml`（PRごとのcheck/build/E2E）には
   一切手を加えていない。`deploy.yml`は`main`へのpush時のみ、`GITHUB_PAGES_BASE=/mtg-card-scanner/`
   で`npm run build`し、`actions/upload-pages-artifact` → `actions/deploy-pages`でデプロイする。
6. GitHub側でPages機能を`build_type: workflow`で有効化（`gh api repos/ikdsk/mtg-card-scanner/pages -X POST -f build_type=workflow`）。
   公開URLは `https://ikdsk.github.io/mtg-card-scanner/`。

## 検証

- `npm run check`: 26ファイル/196テスト成功（コード変更は文字列パス構築の書き換えのみ、ロジックは不変）。
- `npm run build`（base未指定、デフォルト`/`）: 成功、`dist/index.html`の全パスが従来通り`/`始まりであることを確認。
- `GITHUB_PAGES_BASE=/mtg-card-scanner/ npm run build`: 成功、`dist/index.html`の全パスが`/mtg-card-scanner/`
  プレフィックス付きになることを確認。
- `GITHUB_PAGES_BASE`ビルドの`dist/`を`/tmp/pages-sim/mtg-card-scanner/`に配置し、
  `python3 -m http.server`でサブパス配信を再現。以下を実データで確認：
  - `curl`で主要パス（index, favicon, og-image, scanner.worker.mjs, THIRD-PARTY-NOTICES.md, robots.txt,
    ビルド後のJSバンドル）が全て200
  - Playwrightで`http://127.0.0.1:4340/mtg-card-scanner/`を開き、`pageerror`/コンソールエラー/
    `requestfailed`が0件、タイトルが正しく`Mana Peek`、スクリーンショットでマナホイールロゴが表示
  - フッターの「第三者ライセンスと利用条件」リンクの`href`が`/mtg-card-scanner/recognition/THIRD-PARTY-NOTICES.md`
    に正しく解決されることを確認
- `MVP_PORT=4317 npx playwright test`（デフォルトbase、既存CI相当）: 330/330成功、回帰なし。

## 既知の制限

- `og:image`/`twitter:image`は`%BASE_URL%og-image.png`でサイト相対パスのまま。OGPの仕様上は
  絶対URLが推奨（一部プラットフォームは相対パスを解決できない）。GitHub Pagesの公開URLが
  `https://ikdsk.github.io/mtg-card-scanner/`に確定した今、絶対URLに変更する追加対応が望ましい
  （本PRのスコープ外、別途対応）。
- GitHub Pagesの実際のデプロイ・公開後の動作は、mainマージ後のActions実行結果で確認する必要がある
  （ローカルのサブパスシミュレーションでの検証であり、GitHub Pages特有のCDNキャッシュ挙動等は未検証）。
