# Recognition root cause — diagnostic only

## 結論

**今回の拒否の主因は Cornelius の四隅推定 → 不正確な crop であり、Milo の日本語/最新カードの識別能力や catalog 未収録が主因ではない。** 正しい既知四隅だけを与えると、同じモデル・辞書・射影関数で全7カード fixture が正しい oracle、score ≥0.75、margin ≥0.025 を満たす。負例は0.539434のまま。この操作は検出をバイパスした診断であり、製品gate通過・実機精度の合格ではない。

副因として、現行射影の画素中心座標の差が存在する。既知全カード四隅の射影は直接resizeに対して最新日本語0.857183 vs 0.907416。画素中心整合だけで0.907900に回復。ただしこれだけでは誤った検出四隅は直らない。

製品修正・commit・pushなし。専用worktree `recognition-debug` の `227e745`、git status clean。既存 `http://127.0.0.1:4189/?localAssets`、Chromium channelで既存ローカル資産のみ使用。

## 再現・検証

```sh
node /Users/dikeda/workspace/mtg-card-scanner-research/recognition-root-probe.mjs
python3 /Users/dikeda/workspace/mtg-card-scanner-research/recognition-root-verify.py
```

- Playwright route interceptionでworker応答に診断handlerだけを追記。元の製品処理を編集せず、同じ `detect/dewarp/identify/search` を呼ぶ。
- 1 fixture毎に新worker。入力は親試験と同じDOM canvas resize、worker側OffscreenCanvas `{willReadFrequently:true}`。同一画像2回detect後に段階別比較。
- 全8 fixture完走。親 `model-report.json` と**全件の四隅・cardPresent、scoreがある全件のscore完全一致**をassert済み。背景の0.6898515772997085も再現。
- 読み込んだworkerは専用worktreeとbyte一致。SHA256 `eb192ea53ae3e8054a1090b5a2ea87a2686f9efd5079383bd47dd484054a7230`。
- JSONに生の四隅、confidence、各variantのidentity/score/margin、catalog被覆、親baseline、検証assert結果を保存。
- スコアはcosine類似度であって確率ではない。

## 段階別結果

|fixture|製品 score|既知crop＋現行射影|射影なし全画像resize|画素中心整合射影|
|---|---:|---:|---:|---:|
|latest-en|0.615608|0.969996|0.995968|0.996160|
|latest-ja|0.496644（誤oracle）|0.857183|0.907416|0.907900|
|classic-ja|0.807382|0.822547|0.824433|0.824311|
|double-face|no card|0.995932|0.998640|0.998727|
|latest-ja-rotated|0.480880（誤oracle）|0.903811|0.908385|0.908817|
|latest-ja-background|0.689852|0.841216*|0.429897**|0.428535**|
|latest-ja-blur|0.496699|0.860311|0.854147|0.855682|
|negative-blank|no card|0.539434|0.539434|0.539434|

既知cropは背景以外 `[[0,0],[1,0],[1,1],[0,1]]`。*背景は画像を視認してカード矩形 `(190,207)-(610,793)` / 800×1000 を使った診断。元生成スクリプトから取得した厳密ground truthではなく、視覚的な既知矩形。**背景の全画像はカードcropではないため誤oracle。当然ながら「いつでも全画像を使う」修正は不可。

### 1. 四隅検出 — 主因、再現確認

対象 `public/recognition/scanner.worker.mjs:788-843`, `1031-1053`。

- latest-en: 四隅が外周から約3–5%内側。正しい外周に置換するだけで0.615608→0.969996。
- latest-ja: 右下の推定が `(0.9478,0.5666)`。実際の右下は画像下端。カードの本文を失う台形cropとなる。検出confidenceは約0.0369で0.02を超え、quad妥当性も通る。`cardPresent/cornersValid` は外周正確性を保証しない。
- double-face: sharpness <0.02でearly return、埋め込み・検索は製品経路では未実施。検出四隅もカード外周でなく画像中央の小領域。診断でその誤cropを強制的に認識させても0.476877・誤oracle。一方、既知全カードcropは0.995932で正しいID。**sharpness閾値を下げても直らない**。
- background: 四隅の数pixel差でもMiloのscoreが下がる。より正確な矩形では0.841216。精密cropに対する感度がある。
- blur: 誤った内側crop0.496699から既知外周0.860311。今回は「ぼけでMiloが認識不能」が主要説明ではない。

### 2. 角順と射影 — 角順だけでは解決せず、画素中心差は実在

対象同worker `72-116`, `846-901`。

- raw Cornelius pointsを幾何順に並べ直してから実pixel長の最短辺を上にする。classic-jaでは180°が先頭になるが、製品は180°も照合するため0.807382で成功。
- 最短辺回転をやめTL起点の幾何順だけにする診断でも、latest-ja 0.518447、rotated 0.520766で誤oracleのまま。**角順の単独バグが主因という仮説は否定**。誤四隅で縦横判定が崩れることは二次的悪化要因。
- 現行はnormalized source cornerに `width,height` を乗じ、destinationを `[0,447]` に写す。画像全体を直接resizeする画素中心の対応とは異なる。
- 同じ射影関数に source x端点 `width/(2*448)-0.5` と `width-width/(2*448)-0.5`（yも同様）を与えただけで、最新英語0.996160、日本語0.907900。直接resizeとほぼ同値。つまりhomographyの解法やRGB/NCHWが全面的に壊れているわけではない。
- 正規化四隅を「画像境界」か「画素中心」か明文化せず、camera全体へこの補正を機械的に適用するのは避ける。端点補正の診断成立は製品全条件への修正妥当性とは別。

### 3. 埋め込み前処理 — 上流仕様と整合

対象同worker `527-545`, `904-955`。

固定revisionのモデルカードを実取得して比較：

- Milo: 448×448 RGB、ImageNet mean `[.485,.456,.406]` / std `[.229,.224,.225]`、NCHW float32、128次元L2。製品は一致。portrait→square squashは仕様であり、448×縦横比保持に変えるのは誤り。
- Cornelius: 384×384 RGB、同ImageNet標準化、NCHW。製品は一致。2.x presenceは定数なのでsharpnessを使うのも上流どおり。
- 最新日本語の適正cropを英語catalogと照合して0.907416。言語差の残余はあるが、今回の0.496644の主要原因ではない。
- モデルカードのcorners TL→TR→BR→BL記述と実raw点列の見かけ順序には注意が要るが、既存sortと180°検索を外す根拠にはならない。

参照:
- https://huggingface.co/HanClinto/milo/raw/9bcc5e809e936b8c5630d1e7101aae1de1e76621/README.md
- https://huggingface.co/HanClinto/cornelius/raw/9280009f5a66f75f952820d9dadb894909b759b7/README.md

### 4. catalog一致 — 必要oracle収録済み、印刷版は別問題

対象同worker `958-992`、runtimeのロード済み配列を直接count。

- Academic Ascent: oracle 1行、英語printing 1、日本語printing 0。
- Lightning Bolt: oracle 68行、日本語fixture printing 0。
- Aang and Katara: oracle 2行、該当printing 2行（front fixtureのみ実験。裏面精度の証拠ではない）。
- 正しいoracleはすべて存在し、適正cropで照合成功。catalog欠落や埋め込みversion全面不整合の説明とは合わない。ただし日本語の正しいprintingが自動特定されるとは主張できない。

## 最小修正案（提案のみ）

1. **既知のカード全面画像/ユーザー指定cropの入力経路**をカメラ自動検出と分ける。明示されたcropだけはdetector再推定せず、既知四隅または直接448 resizeで識別する。閾値0.75/margin0.025/複数フレームの安全方針は維持。ファイルがportraitという理由だけでfullcardと自動決め打ちしない。背景fixtureが反例。
2. カメラ経路はdetectorが誤った内部領域を選んだとき再撮影/手動四隅指定へ逃がす。outline精密化または検出器の更新を別途比較評価。短辺選択・quad凸性だけでは境界正確性を検証できない。適当なquad拡張や閾値低下だけの修正は避ける。
3. 射影座標のpixel-center契約を単体テスト（identity cropとcanvas resizeの画素/embedding一致）にする。既知fullcard経路の直接resizeが最小かつ安全。任意射影全体を直す場合は座標定義に合わせた専用検証が必要。
4. 追加回帰として、同8画像で(a)製品検出経路、(b)ground-truth crop経路の両方を残し、top1 oracle/score/margin/角誤差を分離。既知crop合格をcamera精度合格に置き換えない。

## 調査時の問題・限界

- 初回probeはworker canvasの `willReadFrequently:true` を省略し、親scoreと微差が出た。これがChromiumのraster経路を変え、SimCCピーク位置が変わることを実測（背景0.750725 vs 正しい製品経路0.689852）。同オプションを揃えた最終結果は親と完全一致。省略版の数値を最終証拠に採用していない。将来probeでcanvas設定も揃える必要あり。
- `web_extract` backendが抽出非対応だったためcurlで固定revisionのREADMEを取得。モデル再DLなし。
- 本調査は公開参照画像・合成加工だけ。独立実写、裏面、スマホ、他カードへの一般化は未試験。Corneliusモデル自体の一般的低品質を証明したものでもなく、モデル採否には別の多様な実画像評価が必要。

## 親の追加camera経路証拠

`mvp-independent-evidence/camera-path.json` を確認。公開classic-jaを背景中央に置いたsynthetic fake videoによるreal getUserMedia→worker→Scryfall経路で `videoStarted/recognitionDisplayed/oracleMatches/tracksStopped/searchAfterStop` が全true、errors空。従ってcamera接続全体が壊れているという説明ではない。この成功は今回のlatest-ja/DFCの四隅失敗を否定せず、実物精度でもない。

## 成果物

- `recognition-root-cause.md`（本報告）
- `recognition-root-cause.json`（全8 fixtureの段階別生結果と検証結果）
- 診断再現用 `recognition-root-probe.mjs`, `recognition-root-verify.py`, `recognition-root-worker-source.mjs`, `recognition-root-probe.log`（すべてresearch下、製品コードではない）
