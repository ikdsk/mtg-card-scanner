---
created: 2026-10-04
status: research-proposal
---

> 調査開始時点の独立提案。役割・パス・採用仕様・数値目標の競合時は `docs/development-plan.md` と `docs/contracts.md` を優先。製品合格の報告ではない。

# MTG Card Scanner — 認識・性能レビュー

調査日: 2026-10-04。一次資料を curl / GitHub API で確認。**推奨は「CollectorVision + WASM を条件付き第一候補、OCR を比較候補」**。これは採否前の検証計画であり、スマートフォン実測・重み実行は未実施。大容量のモデル・カタログ・カード画像は取得していない。製品コード、コミット、GitHub変更なし。

## 1. 認識方式と確認できた事実

- **CollectorVision**: 四隅検出 → 射影補正 → 128次元埋め込み → カタログ近傍検索。ブラウザー実装は capture/UI を main thread、検出・補正・埋め込み・検索を worker に分離し、Scryfall の価格等は認識後に非同期補完する。今回の要求との適合性が高い。[1][3]
- 固定調査版 `2a122d00d25c8d112a90e47bf235a021e0c53b0c` の stable は **Cornelius 2.12**（384入力、4,407,545 bytes）と **Milo 1.0.0**（448入力、5,191,100 bytes）。Cornelius 2.x の `presence` は定数なので「カードがある確率」として扱わず、sharpness・四辺形品質・一致スコアを評価する。[2][5]
- **起動の支配項は重みだけではない**。取得した feed（checked_at `2026-10-03T12:37:28Z`）では MTG v52、113,113行、英語優先の paper printings。v50 base の圧縮埋め込み＋records は 35,526,376 bytes。重みと合わせたサイズ合算は約45.13 MB（十進、差分・ORT・アプリを除く。実転送量ではない）。FP16行列だけで展開後約28.96 MBとなり、JSON解析・コピー・推論用メモリは別途必要。[2][8]
- **日本語カード・版の精度は未確認**。Milo は illustration_id + set_code で学習、上下逆転に感度があり、現行 scanner は180度も評価する。日本語版、同一絵柄の再録、foil/etched、両面の正答を保証する資料ではない。カード同定と「印刷版・言語・finishの同定」は別指標にする。[1][6][8]
- **WASMを初期基準にする**。作者は Android ARM の WebGPU で例外を出さない誤出力を報告し、現行構成は WASM default / WebGPU opt-in。これは作者の報告であり、現行全端末に同じ不具合があるという断定ではない。「動いた・速かった」だけではGPU採用不可。[3]
- **比較候補: Tesseract.jsによる端末内OCR**。ブラウザーWASM、再利用workerが公式に用意されている。提案はカード名ROIを先に読む小さな比較系、必要時のみセット略号・番号ROIを追加。日本語精度、辞書DL、初回起動、装飾文字への耐性は未実測。巨大な画像照合カタログを避けられる可能性はあるが、認識辞書・名前索引の容量まで含めて比べる。[10]

READMEの「laptop CPUで100ms未満」は作者の主張であり、PWAの初回DL・カメラ許可・スマホの熱・価格取得を含むSLOには転用しない。[1]

## 2. 利用条件 — コードとデータを混同しない

| 対象 | 確認済み | 採用前の未確認事項 |
|---|---|---|
| CollectorVisionコード | 公開既定はAGPL-3.0。別の非商用・商用ライセンスは「取得できる」という案内で、個別grantが必要。[1][4] | アプリ公開形態に対する義務、別契約の実際の条項・価格・範囲。無料個人利用だから自動的にAGPL免除とは解釈しない |
| Cornelius / Milo重み | 固定revisionの両モデルカードに `license: agpl-3.0`。[5][6] | コードの別契約が重み・再配布・変換にも及ぶか、base model / 学習素材の権利連鎖 |
| Catalogコード / 配布データ | CatalogリポジトリのLICENSEはMITの「Software」への許諾。feedにはScryfall由来と記載。[7][8] | 埋め込み・レコードをMITで自由再配布できるとまでは確認していない。ソースデータ条件、ホスティング・派生カタログの許諾を別途確認 |
| Scryfallデータ / 画像 | API利用ガイドはデータへのpaywall、単なる再配布・proxy、誤認するブランド利用等を制限。画像の著作権・artist表示を隠す加工等も制限。[9] | 内部前処理・埋め込み生成と再配布の許諾範囲、Wizards Fan Content Policyとの適合。モデルライセンスをカード画像の権利とみなさない |
| Tesseract.js | READMEとLICENSE APIでApache-2.0確認。[10][11] | 実際に配布するcore/WASM・日本語/英語traineddataそれぞれのバージョンとライセンス。OCR方式でもカードデータの条件は残る |

法的適合を確定する報告ではない。公開前に配布物ごとの権利表を埋め、必要なら権利者確認を行う。

## 3. 最小の技術検証計画（提案、未実行）

**端末**: 対象下限候補のiPhone + 比較用の新しいiPhone（Safari通常タブ / ホーム画面PWAを別測定）、Android中価格帯 + 比較用上位端末（Chrome）。機種・OS・ブラウザー・RAMが取得可能ならRAM・省電力状態・温度傾向・回線条件・build/model/catalog版を必ず記録。シミュレーターだけで採否を決めない。

| シナリオ | 計測起点と終点・条件 |
|---|---|
| 初回 | サイトストレージ空から navigation → UI応答可能 → カメラ映像 → model/catalog ready → 初候補 → メタデータ/価格表示。許可ダイアログの人間待ち時間は別記。Wi-Fiと帯域/RTT固定の低速条件を分離 |
| 再訪 | キャッシュあり・タブ/ブラウザーを終了して再起動。同じ各区間を測る。更新なし / 差分更新あり / キャッシュ消去・容量不足を別ケースにする |
| 次カード | 同一セッションで別カードが安定して入った時刻 → 正しい候補表示。前カード残像・重複抑止・キャンセルを確認。10分の連続使用で速度劣化・停止を観察 |

- **分解ログ**: fetch bytes、展開/parse、IndexedDB read/write、ORT compile/init、初回warm-up、frame transfer、detect、warp、embed（正立/180度）、search、安定確認待ち、UI描画、メタデータ/価格待ち。workerとmainの時間基準を揃え、送受信時刻も残す。メモリ計測APIが無い端末は「測定不可」とし、再読込・OS kill・長時間劣化を代理観測する。
- **回数**: 初回/再訪は各端末・条件でまず10試行の探索、採否時は30試行以上。中央値・p95・最大・失敗数・全試行数を併記し、少数標本のp95を強い保証にしない。
- **認識セット**: 調整用と評価用をカード/絵柄単位で分割。許可を得た実物撮影の評価用100枚以上を出発点に、日本語/英語、旧枠/新枠、同一絵再録、別絵、foil、スリーブ反射、両面/特殊レイアウトをタグ化。明所正面・傾き/逆向き・暗所/反射を評価し、カードなし/他ゲーム/未収録も別の負例群にする。実カタログ被覆の欠落とモデル誤りを分ける。
- **品質**: oracle相当のカード同定 top-1/top-5、印刷版正答率、認識保留率、負例誤受理率、高信頼誤同定率、ユーザーの版修正率。cosine scoreを確率表示しない。top-1/top-2差と複数フレーム一致で保留条件を校正する。

## 4. 実装前に決める難点と採否ゲート

- workerは重い処理を隔離するが推論自体を速くする保証はない。最新フレーム1件だけ処理し、滞留キューを作らず、bitmap/tensorを解放する。スキャン中はworker/ORT sessionを再利用する。ORTの複数WASM threadにはbrowser対応と `crossOriginIsolated` が必要。COOP/COEP/CORS・画像配信との両立、1-thread fallbackを実機検証する。JSとWASMは同一buildを固定する。[12]
- catalog v2はIndexedDBキャッシュと差分更新を備える一方、metadataを保持しない設定でもrecordsのDLは減らない。[3] 提案: 起動時に利用可能な旧snapshotで開始し、更新は裏で取得・検証してから次セッションに切替。容量不足・途中切断・OSによるキャッシュ消去を正常な復旧経路として扱う。
- Miloの版違い埋め込みは非互換。[6] model hash / embedding family / catalog snapshot / ORT buildをセット管理し、新旧混在を禁止。原子的切替・前版へのrollback・旧版削除時機を検証する。モデル更新と通常カタログ差分更新を分ける。
- **候補ゲート（ユーザー合意前の目標値）**: 対象下限端末で「再訪→スキャン準備」p95 ≤2秒、「安定した次カード→候補」p95 ≤1秒。初回は即座に進捗・必要DL量・中止を表示し、約45MB以上の初期資産を受容できるか回線別実測で判断。達成見込みを保証しない。
- **品質・安全ゲート**: 通常条件でカード同定top-1 ≥95%を仮目標とし、層別の失敗を必ず報告。評価用の高信頼誤同定ゼロを目指すが、標本ゼロ件を真の誤率ゼロと解釈しない。版不明は手動選択へ逃がす。10分連続でクラッシュなし、旧版cacheから復旧可能、通信検査で撮影画像/特徴量の外部送信なしを必須確認。
- **採否**: 権利整理、端末WASM性能、精度/保留UI、更新復旧の全ゲートを満たせばPWA候補採用。起動容量が許容できなければOCRとの比較、必要ならネイティブ端末内推論へ再設計。サーバー画像認識へ無断で切り替えない。WebGPUはCPU/WASMとの出力・順位一致を確認できた端末構成だけで再評価する。

## 5. 並列担当との境界（提案）

- **入力**: `scanId`, `frameId`, `capturedAt`, `ImageBitmap`, `orientation`。main→専用workerのみ。カメラ画像は保存しない既定とし、診断保存は明示同意にする。
- **出力**: `status=loading|ready|candidate|ambiguous|no_match|error`, `scanId`, `frameId`, `candidates[{source,scryfallId,faceIndex,score}]`, `scoreMargin`, `qualityFlags`, `timingsMs`, `modelVersion`, `catalogVersion`, `backend`。非MTG/TCGplayer IDをScryfall UUIDと混同しない。候補のsource依存IDという性質は原実装にもある。[1]
- **メタデータ担当**: 候補ID→カード同定→日本語名/英語名・日本語印刷版情報を補完。`detectedCandidateId` / `selectedPrintingId` / `metadataLocale` / `finish` / `selectionSource=auto|user`を別管理し、日本語表示のために価格対象の版を勝手に変更しない。版の上書き後は遅延した認識結果でユーザー選択を戻さない。
- **価格/UI担当**: 選択された版とfinishに紐づくScryfall USD、概算JPY、為替・取得時刻・欠損状態を非同期表示。価格待ちを認識待ちに含めず、価格なしを0円にしない。認識担当は為替取得や価格保証を持たない。メタデータAPIへIDが送信されることと「撮影画像を送信しないこと」は別に説明する。

## Sources

[1] https://raw.githubusercontent.com/HanClinto/CollectorVision/2a122d00d25c8d112a90e47bf235a021e0c53b0c/README.md
[2] https://raw.githubusercontent.com/HanClinto/CollectorVision/2a122d00d25c8d112a90e47bf235a021e0c53b0c/collector_vision/data/model_registry.json
[3] https://raw.githubusercontent.com/HanClinto/CollectorVision/2a122d00d25c8d112a90e47bf235a021e0c53b0c/examples/web_scanner/ARCHITECTURE.md
[4] https://raw.githubusercontent.com/HanClinto/CollectorVision/2a122d00d25c8d112a90e47bf235a021e0c53b0c/COMMERCIAL_LICENSE.md
[5] https://huggingface.co/HanClinto/cornelius/raw/9280009f5a66f75f952820d9dadb894909b759b7/README.md
[6] https://huggingface.co/HanClinto/milo/raw/9bcc5e809e936b8c5630d1e7101aae1de1e76621/README.md
[7] https://raw.githubusercontent.com/HanClinto/CollectorVisionCatalog/main/LICENSE
[8] https://raw.githubusercontent.com/HanClinto/CollectorVisionCatalog/main/catalog-feed-v2.json
[9] https://scryfall.com/docs/api
[10] https://raw.githubusercontent.com/naptha/tesseract.js/master/README.md
[11] https://api.github.com/repos/naptha/tesseract.js/license
[12] https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html
