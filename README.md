# Mana Peek 🔍

MTGカードにスマホのカメラをかざすだけで、**日本語のカード名・ルールテキスト・参考価格**をすぐ確認できるカードスキャナーです。

<p align="center">
  <img src="docs/screenshots/intro.png" alt="Mana Peek の待機画面。スキャン開始ボタンと簡単な使い方の説明が表示されている" width="280">
  <img src="docs/screenshots/card-detail.png" alt="認識したカードの詳細。日本語名・参考価格・対応フォーマットバッジ・日本語ルールテキストが表示されている" width="280">
  <img src="docs/screenshots/links-and-printings.png" alt="カード詳細の下部。Wisdom Guild・晴れる屋への外部リンクと、日本語/英語の他の印刷版一覧が表示されている" width="280">
</p>

## できること

- 📷 **カメラでかざすだけ** — 確認操作なしで、カード名・参考価格・対応フォーマットがすぐ表示されます
- 🇯🇵 **日本語優先の表示** — 日本語版があれば日本語名・日本語ルールテキストで表示（無ければ英語を明示）
- 💰 **参考価格（USD / JPY概算）** — Scryfallの価格情報とFrankfurter/ECBの為替レートから算出
- 🔖 **任意保存の履歴** — 気になったカードだけ「履歴に保存」。自動保存はしません
- 🔁 **他の候補・印刷版の比較** — 似ているカードを見比べたり、日本語・英語の別版を確認できます
- 🔗 **外部サイトへのリンク** — Wisdom Guild・晴れる屋の検索結果へワンタップ
- ⌨️ **名前検索** — カメラが使えない場面でも、カード名から同じ情報を確認できます

## 使い方（かざす → 見る → 任意保存）

1. 「スキャン開始」をタップしてカメラを起動し、カード全体を画面に収めます
2. カードが認識されると、確認操作なしで情報が表示されます
3. 画像や名前をタップすると詳細シートが開きます（開いている間は表示が固定されます）
4. 残したいカードだけ「履歴に保存」。保存は完全に任意です

認識はあくまで候補です。実物の版・言語・加工（Foilなど）は、表示されたセット情報と見比べて確認してください。

## 動かしてみる（開発者向け）

Node.js 24が必要です。

```sh
npm ci
npm run dev -- --port 4187 --strictPort
```

`http://localhost:4187` を開きます。認識モデルは「スキャン開始」または画像選択時に初めてダウンロードされます
（モデル約9.6MB、辞書約35.6MB）。名前検索だけならモデルのダウンロードは不要です。

カメラの利用にはHTTPS（またはlocalhost）のsecure contextとブラウザの明示許可が必要です。
スマホの実機で試す場合は、HTTPSでアクセスできる環境を別途用意してください。

### テストを動かす

```sh
npm run check        # 型チェック + 単体テスト
npm run build
npm run preview -- --port 4187 --strictPort
npx playwright install chromium
npm run test:e2e     # ブラウザE2Eテスト（desktop + 390×844 mobile viewport）
```

E2Eはビルド済みの静的ファイルを専用ポート（既定4187、`MVP_PORT`で変更可）で配信してテストします。
実行前に必ず `npm run build` してください。Chromeを明示する場合は `PLAYWRIGHT_CHROME_PATH` を指定、
通常はPlaywright付属のfull Chromiumを使います。

サーバー待受けなしのmockテストも用意しています：

```sh
npm run build
PLAYWRIGHT_NO_SERVER=1 npm run test:e2e
```

### 実モデル・実APIでの再現確認

```sh
npm run assets:prepare
npm run dev -- --port 4187 --strictPort
```

`http://localhost:4187/?localAssets` を開くと、ローカルにダウンロード済みの認識モデル・辞書資源を
使って動作確認できます（サイズ・SHA-256検証つき）。モデル・辞書・カード画像自体はリポジトリに
含まれません（`public/recognition/assets/` `public/recognition/vendor/` はgit管理外）。

```sh
npm run evidence:live
```

実ブラウザでの画像認識→検索/価格/為替取得までを通しで確認し、結果を`artifacts/live/<label>/`に保存します。

## 技術的な注意点・制限事項

- **認識は候補です**。実物の版・言語・加工（Foil等）は必ず画面の表示と照合してください。実物写真・特殊枠・反射などでの精度は未検証です。
- 「他の候補」は認識エンジンが返す上位候補（最大5件）のうち、Scryfallで実在確認できたものだけを表示します。
- 日本語の**印刷本文**と英語の**Oracle本文**は別に表示します。両面カードで片方の面だけ未翻訳の場合、翻訳済みの面のみ日本語で表示します（英語を日本語と偽ることはありません）。
- 他の印刷版一覧は日本語・英語版のみに絞り込みます。
- 価格は選択した印刷・加工のUSD欄から算出。日本語価格が欠けていても英語価格へ自動で置き換えることはありません。JPYは参考換算値で、固定レートは使っていません（為替取得失敗時はUSDのみ表示）。
- Scryfall APIのレート制限を尊重した間隔でリクエストします（検索系は510ms以上、その他は110ms以上の間隔、429応答後は30秒以上待機）。
- 画像・特徴量の外部送信やアカウント、アクセス解析は行いません（モデル配信元・カード検索語・為替ペアへの通信のみ発生します）。
- ダーク/ライト表示はOSの設定に追従します。

## ライセンス

本リポジトリ全体を **[AGPL-3.0-or-later](LICENSE)** でライセンスしています。

組み込んでいる認識エンジン（CollectorVision、Cornelius、Miloモデル）がAGPL-3.0のため、
ネットワーク経由で利用可能にする場合は利用者へCorresponding Sourceを提供する義務があり、
本リポジトリを公開することでその義務を満たしています。詳細な出典・各ライブラリの条件は
[`public/recognition/THIRD-PARTY-NOTICES.md`](public/recognition/THIRD-PARTY-NOTICES.md) に記載しています。

カード画像はScryfall（`cards.scryfall.io`）から直接表示しており、独自に再配布・保存はしていません。
カードデータ・画像自体の再配布権はScryfall / Wizards of the Coastの利用条件に従います。

Magic: The Gathering およびそのカード名・テキスト・トレードマークは、Wizards of the Coast LLCの
所有物です。本プロジェクトはWizards of the Coastと提携・公認された製品ではありません。
