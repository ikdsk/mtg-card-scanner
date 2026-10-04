# MVP 第2回 独立コードレビュー

## 結論

**FAIL — 残ブロッカー P2 1件（R6-persist）。security_concerns は空。**

- 対象: `227e745bab3ef449f8d5e10d4f3dd3c1b36b6878`、比較base `38a9f58`。
- 専用worktree: `/Users/dikeda/workspace/mtg-card-scanner-worktrees/qa-mvp-2`（detached）。
- 旧必須7件をそれぞれ再確認。R1/R2/R3/R4/R5/R7の修正を確認。R6は通常の更新失敗fallbackと再開を実装したが、永続化失敗時の旧snapshot保持が不完全。
- worker初回init消失とgzip HTTP自動展開の修正をコード＋実Chromiumの合成試験で確認。
- 製品コード変更、threshold引下げ、テスト弱体化、commit、pushは一切していない。終了時 `git status --porcelain` は空、HEADは対象SHAのまま。
- **このコードレビューは公開承認ではない。** 実モデル/実資産による縦通しは親担当、実機・実物写真精度・公開許諾は本レビューでは未検証。

## 残ブロッカー

### R6-persist / P2 — catalog保存失敗でも旧完全snapshotを削除

- ファイル: `public/recognition/lib/collectorvision-catalog-v2.mjs:388-390,395-400,709-715`
- 原因: `#persistSnapshot` は `cache.put` 例外をログにして正常returnする。呼出元は成功確認なしで `#pruneCachedVersions` を実行し、旧版を削除する。
- 影響: ストレージ不足などで新版保存に失敗しても、その場のメモリ上v52は動く。しかし唯一の永続化済みv51が消えるため、次回worker起動/画像再スキャン時にネットワーク資産が利用できないと、旧版fallbackできず認識が停止する。`main.ts:134` は画像ごとにworkerをdisposeするため再起動経路は通常操作にも存在する。
- 期待: 新版の永続化に失敗したとき、最後の完全・互換な旧snapshotは削除せず保持する。
- 修正提案: 保存成功を明示的に返して成功時だけpruneする、または保存と旧版削除を単一の成功transactionへ限定する。**新規機能要求ではなく既存更新復旧契約の修正。**

独立再現:

```sh
node /Users/dikeda/workspace/mtg-card-scanner-research/mvp-review-2-probe.mjs
```

合成v51キャッシュ、有効なgzip/hash付きv52 delta、`cache.put`だけに `QuotaExceededError` を注入。続くロードではfeedを返し資産を503にした。製品catalog clientを直接importして実行。出力:

```json
{
  "synthetic": true,
  "persistedBefore": [51],
  "activated": 52,
  "put": "QuotaExceededError",
  "deleted": [50, 51],
  "persistedAfter": [],
  "reloadError": "request failed (503): https://hanclinto.github.io/CollectorVisionCatalog/catalog-v2/scryfall-mtg/version/50/base/records.jsonl.gz"
}
```

exit 0は「欠陥再現assert成立」を示す。実端末でのquota発生率は未測定であり、実IndexedDBの容量を埋めた試験ではない。注入可能なcache interfaceの失敗後に旧snapshot削除が実行されることを再現した。

## 旧指摘・追加指摘の対応表

| 対象 | 判定 | ソース・実行根拠 |
|---|---|---|
| R1 native fetch receiver | 修正確認 | `src/data/http.ts:72-73` はローカル変数で呼出。Chromium E2Eはwindow.fetchを置換せずrouteで合成HTTPを返し、検索/カード/FX成功。providers.testのreceiver試験も成功。 |
| R7 500ms/429 cooldown | 修正確認 | `http.ts:23-53,65-75` 共有transport+originスケジュール、対象endpoint510ms、その他110ms、429で30.1秒と長いRetry-After尊重。`providers.test.ts:66-127` の別client共有、待機中abort、後列abortを実行成功。実サービス過負荷試験はしていない。 |
| R2 訂正検索で旧認識応答復活 | 修正確認 | `main.ts:165-167,188-194` detail世代増加、abort、session reset。`smoke.spec.ts:74-106` 遅延認識card→訂正検索→旧応答解放をdesktop/mobile viewportで成功。 |
| R3 LICENSE 404 | 修正確認（該当原因） | `scripts/prepare-assets.mjs:30-31` のMicrosoft v1.24.3 LICENSE/ThirdPartyNoticesを独立GET。双方HTTP200、固定SHA一致。全assets:prepareは大容量重複回避のため親担当。 |
| R4 不正HTTP200のcache汚染 | 修正確認 | `http.ts:76-78` validator成功後だけ保存。card/FX/search不正→正常で再fetch・復旧する試験成功（`providers.test.ts:48-54,128-139`）。 |
| R5 provider identity | 修正確認 | `repository.ts:34,42-47,50-59` requested idとprintings全ページのoracleを検証。`session.ts:24-30` id/oracle/lang・世代revisionを検証。provider mismatch→retry、ABA、finish override後の旧成功/エラー排除試験成功。 |
| R6 catalog更新復旧 | **残P2あり** | `catalog:368-390` 互換active fallbackと検証済みcandidate永続化、`worker:757-763` モデルhash/寸法/旧v50-51互換を確認。既存catalog3試験（更新失敗・異モデル拒否・復旧再開）は成功。ただし保存失敗→pruneの独立probeは上記欠陥を再現。 |
| Issue10 初回worker init | 修正確認（合成runtime） | `scanner.worker.mjs:1151-1154` listener登録後、init handler内でORT import。`smoke.spec.ts:57-71` import遅延200ms中の初回initがvalidationまで届く実worker試験、両viewport成功。実モデルをロードした証拠ではない。 |
| Issue10 gzip | 修正確認（合成payload） | `vite.config.ts:8-34` dev/previewで生gzip送信。previewのbrowser assets試験2件成功。独立dev probeも実Chromium fetchでContent-Encoding=null、54bytes、SHA一致。catalog側`:724-732` のsize/hash照合を削除せず維持。 |

追加観察（非ブロッカー）:

- 専用port4191、`reuseExistingServer:false` でE2E。旧S1の誤サーバー検証回避を確認。
- noticesのcatalog改変宣言は修正済み（`:10-13`）。ライセンス文書取得成功はモデル/カードデータの公開権利承認を意味しない。
- `scripts/live-evidence.mjs:44-47,55-76` にOracle照合、選択printing/finishのUSD/JPYおよび手動指定価格照合が追加されている。実行は親担当。認識physical printing一致は別記録であり自動認識による実物版確定とはしていない。
- gateのcosine0.75 / margin0.025 / 同一ID2回の閾値は維持。実写真での較正は未実施。
- 自作src/scripts/configの追加差分をeval/exec/innerHTML/shell/secretの簡易静的チェック＋コード読解。新たなsecurity blockerは検出しなかった（網羅的セキュリティ監査ではない）。

## 独立実行結果

Node `v24.2.0`。すべて対象worktreeで実行。

| コマンド | 実結果 |
|---|---|
| `npm ci` | 成功、87 packages、audit 0 vulnerabilities |
| `npm run check` | typecheck成功、10 test files / 129 tests passed |
| `npm run build` | 成功、15 modules、main JS 26.77 kB / gzip10.77 kB |
| `MVP_PORT=4191 npm run test:e2e` | 実Chromium、12 passed（desktop/mobile-viewport各6）。provider/runtime/payloadは明示的合成。 |
| `node .../mvp-review-2-probe.mjs` | 残P2を再現、結果JSON保存 |
| `node .../mvp-review-2-transport-probe.mjs` | dev HTTP200 / encoding null / 54 bytes / SHA一致、exit0 |
| LICENSE/ThirdPartyNotices独立GET | HTTP200、1073 bytes / 325054 bytes、双方固定SHA一致 |
| `git diff --check 38a9f58..HEAD` | 成功 |
| 終了時 `git status --porcelain` / `git rev-parse HEAD` | clean / 対象SHA一致 |

LICENSE SHA: `2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c`。
ThirdPartyNotices SHA: `0e07b95f3a8d6230037707c5c4a2b554d12c4cb67369669ac255635528ffcee2`。
独立dev gzip SHA: `af2d41357dace2881d027c35373daa944f13c8a06d6486536253e73e738a6f67`。

## 作成物・限界

研究ディレクトリのみを成果物所有先とした:

- `mvp-review-2.json` / `mvp-review-2.md`
- `mvp-review-2-probe.mjs` / `mvp-review-2-probe-results.json`
- `mvp-review-2-transport-probe.mjs` / `mvp-review-2-transport-results.json`

npm/build/testによる無視対象node_modules/dist/test-results以外、製品worktreeに変更なし。dev用合成publicDirは研究ディレクトリに一時作成して終了時削除、サーバー/ブラウザ終了済み。

未実行: 大容量資産の重複DL、実モデル再推論、実IndexedDB容量逼迫、iPhone/Androidカメラ実機、公開許諾判断。旧7件＋追加2件のレビュー範囲を超える新規機能は要求していない。
