# mvp-fix2 最終独立再レビュー

## 判定
- **Code-patch approval: PASS**。security_concerns / logic_errors はともに空。差分内に残存する必須修正は確認されなかった。
- **MVP product acceptance: NOT ACCEPTED**。既知の認識精度Issue11は未解決。本パッチは認識精度を修正していない。公開・実機・実カード認識の承認ではない。

## 固定対象と不変性
- 専用worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-mvp-3`
- HEAD: `227e745bab3ef449f8d5e10d4f3dd3c1b36b6878`
- patch / 開始時・終了時git diff SHA256: `ed7f21f97c2db2dd2342bed73b55b828426f0fec914a79080a4953b48fef39f2`
- patchと実diffはbyte一致。4ファイル、122 insertions / 6 deletions。`git diff --check`成功。
- 製品ソース・既存テスト変更、commit、push、外部公開なし。npm ci/build/E2Eによる依存・生成物以外、researchの本報告と独立probeのみ作成。

## 検証結果
### R6-persist: 解消
`collectorvision-catalog-v2.mjs:388–391, 711–718`で永続化成功時だけprune。cacheなし・例外時はfalse、成功時はtrue。実IndexedDB cacheのputもtransaction完了を待つ既存契約を確認。既存成功ケース試験は旧版削除も検証している。

前レビュー独立probeを今回worktreeへ向け、欠陥再現assertを修正後期待値に変更し、新規clientによる再初期化へ強化して実行（exit 0）。実出力:
- QuotaExceededErrorを意図的に発生
- メモリ上のactivated: 52
- retained: [51], deleted: []
- 新規client、更新資産HTTP503時のfallback: 51、updateErrorに503

これは合成cache/合成資産の試験。feedは取得可能で更新資産のみ503であり、ネットワーク全断時の起動保証とは区別する。実端末quota発生率は未測定。

### Issue12: 結果可視化を確認
`main.ts:193–205`の新カードopen時のみ結果をscrollIntoView。価格/FX/印刷候補のrenderResultにはスクロール処理なし。版一覧リトライはreveal=false。select/buttonの再描画前focusを対応要素へpreventScrollで戻し、結果外にfocusがある場合は触らない。

追加独立UI probe（合成provider、実build、ネットワークは全route制御）を390x844と1280x900で実行（exit 0）:
- 新カード結果見出しtopはそれぞれ53.0625px / 58.4375px、viewport内。
- 価格・FX・印刷候補をすべて保留し、ユーザーが検索欄へ戻り未送信テキストを入力してから解放。
- 全応答後も検索欄focus・入力を保持、scrollY=0維持。
- 加工選択後のfocus・価格$2.00を確認。全非同期更新と加工変更後もscrollIntoView呼出しは新カードopenの1回のみ。
- 既存18 E2Eは合成認識worker経由の結果表示、戻る操作、遅延FX・版候補・価格再確認を両viewportで確認。
- 影響範囲のdetailGeneration/request abortとResultSession token照合も確認。今回の同期focus復元には遅延した古いfocusを再適用する予約処理はない。

### 独立再実行コマンド
- `npm ci`: 成功、audit 0 vulnerabilities
- `npm run check`: typecheck成功、10 files / 130 tests passed
- `npm run build`: 成功
- `MVP_PORT=4199 npm run test:e2e`: 18 passed
- `node .../mvp-review-3-persist-probe.mjs`: exit 0
- `node .../mvp-review-3-ui-probe.mjs`: exit 0

## Security
追加行のsecret・shell injection・eval/exec・unsafe deserialization・HTML injectionパターンスキャンは該当なし。差分を目視確認し、外部送信・動的HTML挿入・秘密情報追加なし。元データはtextContent系DOM生成のまま。

## 限界・試験中の問題
- UI probe初回はselectOptionが自動focusすると誤って仮定し、加工focus assertionで失敗。Playwright selectOptionはfocusを保証しないため、事前focusを明示したprobeだけ修正し再実行成功。製品は変更していない。
- 実モデル・資産DL・実カメラ・iPhone/Android実機は未実行。Chromium mobile viewportは実機Safariの証明ではない。
- 既存全コードの再レビューはせず、指定差分とその影響範囲を対象とした。

## 作成ファイル
- `mvp-review-3.json`
- `mvp-review-3.md`
- `mvp-review-3-persist-probe.mjs`
- `mvp-review-3-ui-probe.mjs`
